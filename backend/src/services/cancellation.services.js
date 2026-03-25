const Razorpay = require("razorpay");
const sequelize = require("../config/database");
const { Booking, Event, CancellationPolicy } = require("../models");
const seatService = require("./seat.services");
const logger = require("../config/logger");

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials missing.");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID.trim(),
    key_secret: process.env.RAZORPAY_KEY_SECRET.trim(),
  });
};

/**
 * Given a list of tiers (sorted by hours_before DESC) and the hours
 * remaining until the event, return the applicable refund percentage.
 *
 * Tiers example:
 *   [{ hours_before: 72, refund_percent: 100 },
 *    { hours_before: 24, refund_percent: 50  },
 *    { hours_before: 0,  refund_percent: 0   }]
 *
 * Logic: walk tiers from highest hours_before to lowest.
 * Return refund_percent of the first tier where hoursUntilEvent >= hours_before.
 */
const computeRefundPercent = (tiers, hoursUntilEvent) => {
  // Sort descending by hours_before so we pick the most generous applicable tier
  const sorted = [...tiers].sort((a, b) => b.hours_before - a.hours_before);

  for (const tier of sorted) {
    if (hoursUntilEvent >= tier.hours_before) {
      return tier.refund_percent;
    }
  }
  // Fallback — event is past or below all tiers → no refund
  return 0;
};

// ──────────────────────────────────────────────────────────────────────────────
// POLICY CRUD (organizer)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Create or update the cancellation policy for an event.
 * Only the organizer who owns the event may set it.
 *
 * @param {number} organizerId
 * @param {number} eventId
 * @param {Array}  tiers  — [{ hours_before, refund_percent }]
 * @param {boolean} isCancellationAllowed
 */
const upsertCancellationPolicy = async (
  organizerId,
  eventId,
  tiers,
  isCancellationAllowed = true
) => {
  // Verify event belongs to this organizer
  const event = await Event.findOne({ where: { id: eventId, organizer_id: organizerId } });
  if (!event) {
    throw Object.assign(new Error("Event not found or you do not own this event."), {
      statusCode: 404,
    });
  }

  // Validate tiers
  if (!Array.isArray(tiers) || tiers.length === 0) {
    throw Object.assign(new Error("At least one refund tier is required."), {
      statusCode: 400,
    });
  }
  for (const tier of tiers) {
    if (
      typeof tier.hours_before !== "number" ||
      typeof tier.refund_percent !== "number" ||
      tier.hours_before < 0 ||
      tier.refund_percent < 0 ||
      tier.refund_percent > 100
    ) {
      throw Object.assign(
        new Error(
          "Each tier must have hours_before (≥ 0) and refund_percent (0–100)."
        ),
        { statusCode: 400 }
      );
    }
  }

  // Upsert
  const [policy, created] = await CancellationPolicy.upsert(
    {
      event_id: eventId,
      organizer_id: organizerId,
      tiers,
      is_cancellation_allowed: isCancellationAllowed,
    },
    { returning: true }
  );

  logger.info("Cancellation policy upserted", {
    organizerId,
    eventId,
    created,
    tiers,
    isCancellationAllowed,
  });

  return policy;
};

/**
 * Fetch the cancellation policy for an event.
 * Returns null if no policy has been set.
 */
const getCancellationPolicy = async (eventId) => {
  return await CancellationPolicy.findOne({ where: { event_id: eventId } });
};

// ──────────────────────────────────────────────────────────────────────────────
// CANCELLATION PREVIEW (user — no mutation)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Returns the refund amount the user would receive if they cancel now.
 * Does NOT modify any records.
 */
const previewCancellation = async (bookingId, userId) => {
  const booking = await Booking.findOne({
    where: { id: bookingId, user_id: userId },
    include: [{ model: Event, attributes: ["title", "event_date", "organizer_id"] }],
  });

  if (!booking) {
    throw Object.assign(new Error("Booking not found."), { statusCode: 404 });
  }
  if (booking.payment_status !== "paid") {
    throw Object.assign(new Error("Only paid bookings can be cancelled."), {
      statusCode: 400,
    });
  }
  if (booking.cancellation_status !== "active") {
    throw Object.assign(
      new Error(`Booking is already ${booking.cancellation_status}.`),
      { statusCode: 400 }
    );
  }

  const policy = await getCancellationPolicy(booking.event_id);

  if (!policy || !policy.is_cancellation_allowed) {
    return {
      cancellationAllowed: false,
      reason: "The organizer has not enabled cancellations for this event.",
      refundAmount: 0,
      refundPercent: 0,
    };
  }

  const now = new Date();
  const eventDate = new Date(booking.Event.event_date);
  const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

  if (hoursUntilEvent <= 0) {
    return {
      cancellationAllowed: false,
      reason: "The event has already started or passed.",
      refundAmount: 0,
      refundPercent: 0,
    };
  }

  const refundPercent = computeRefundPercent(policy.tiers, hoursUntilEvent);
  const refundAmount = parseFloat(
    ((booking.total_paid * refundPercent) / 100).toFixed(2)
  );

  return {
    cancellationAllowed: true,
    refundAmount,
    refundPercent,
    hoursUntilEvent: Math.floor(hoursUntilEvent),
    totalPaid: booking.total_paid,
    policy: policy.tiers,
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// CANCEL BOOKING + INITIATE RAZORPAY REFUND
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Cancels a booking and initiates a Razorpay refund.
 * Uses a DB transaction so seats + ticket count are restored atomically.
 */
const cancelBooking = async (bookingId, userId) => {
  // Preview first to validate eligibility (throws on ineligible)
  const preview = await previewCancellation(bookingId, userId);

  if (!preview.cancellationAllowed) {
    throw Object.assign(new Error(preview.reason), { statusCode: 400 });
  }

  return await sequelize.transaction(async (t) => {
    // Re-fetch with lock inside transaction
    const booking = await Booking.findOne({
      where: { id: bookingId, user_id: userId },
      include: [{ model: Event }],
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!booking) throw Object.assign(new Error("Booking not found."), { statusCode: 404 });
    if (booking.cancellation_status !== "active") {
      throw Object.assign(
        new Error(`Booking already ${booking.cancellation_status}.`),
        { statusCode: 400 }
      );
    }

    // ── Restore available ticket count ─────────────────────────────────────
    const event = await Event.findByPk(booking.event_id, {
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    event.available_tickets += booking.tickets_booked;
    await event.save({ transaction: t });

    // ── Restore seats to 'available' ───────────────────────────────────────
    let selectedSeats = [];
    try {
      selectedSeats = JSON.parse(booking.selected_seats || "[]");
    } catch (_) {}

    if (selectedSeats.length > 0) {
      await seatService.releaseSeats(booking.event_id, selectedSeats, t);
    }

    // ── Initiate Razorpay refund ────────────────────────────────────────────
    let razorpay_refund_id = null;
    let finalCancellationStatus = "cancelled"; // if refund is ₹0

    if (preview.refundAmount > 0 && booking.razorpay_payment_id) {
      try {
        const razorpay = getRazorpayInstance();
        const refund = await razorpay.payments.refund(
          booking.razorpay_payment_id,
          {
            amount: Math.round(preview.refundAmount * 100), // paise
            notes: {
              booking_id: String(bookingId),
              reason: "Customer cancellation",
            },
          }
        );
        razorpay_refund_id = refund.id;
        finalCancellationStatus = "refund_pending";

        logger.info("Razorpay refund initiated", {
          bookingId,
          userId,
          refundId: refund.id,
          refundAmount: preview.refundAmount,
        });
      } catch (razorpayErr) {
        // Refund API failure must NOT roll back the cancellation.
        // Mark as cancelled; the admin can manually process the refund.
        logger.error("Razorpay refund API failed — booking still cancelled", {
          bookingId,
          userId,
          error: razorpayErr.message,
        });
        finalCancellationStatus = "cancelled";
      }
    }

    // ── Persist cancellation on booking record ──────────────────────────────
    await booking.update(
      {
        cancellation_status: finalCancellationStatus,
        refund_amount: preview.refundAmount,
        razorpay_refund_id,
        cancelled_at: new Date(),
      },
      { transaction: t }
    );

    logger.info("Booking cancelled", {
      bookingId,
      userId,
      refundAmount: preview.refundAmount,
      cancellationStatus: finalCancellationStatus,
    });

    return {
      booking,
      refundAmount: preview.refundAmount,
      refundPercent: preview.refundPercent,
      cancellationStatus: finalCancellationStatus,
      razorpay_refund_id,
    };
  });
};

// ──────────────────────────────────────────────────────────────────────────────
// RAZORPAY WEBHOOK — mark refund as completed
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Called when Razorpay fires a refund.processed webhook.
 * Finds the booking by razorpay_refund_id and marks it 'refunded'.
 */
const markRefundComplete = async (razorpay_refund_id) => {
  const booking = await Booking.findOne({ where: { razorpay_refund_id } });
  if (!booking) {
    logger.warn("Refund webhook — booking not found for refund ID", {
      razorpay_refund_id,
    });
    return null;
  }

  await booking.update({ cancellation_status: "refunded" });

  logger.info("Refund marked complete via webhook", {
    bookingId: booking.id,
    razorpay_refund_id,
  });
  return booking;
};

module.exports = {
  upsertCancellationPolicy,
  getCancellationPolicy,
  previewCancellation,
  cancelBooking,
  markRefundComplete,
};
