const Razorpay = require("razorpay");
const sequelize = require("../config/database");
const { Booking, Event, CancellationPolicy } = require("../models");
const seatService = require("./seat.services");
const logger = require("../config/logger");


const CANCELLATION_FEE_RATE     = 0.05;
const CANCELLATION_FEE_GST_RATE = 0.05;
const HIGH_TIER_CUTOFF_HOURS    = 72;


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

const matchTier = (tiers, hoursUntilEvent) => {
  const sorted = [...tiers].sort((a, b) => b.hours_before - a.hours_before);
  for (const tier of sorted) {
    if (hoursUntilEvent >= tier.hours_before) return tier;
  }
  return null;
};

const computeCancellationBreakdown = (booking, tier) => {
  const { ticket_amount, convenience_fee, total_paid } = booking;
  const cancellation_fee     = parseFloat(((ticket_amount + convenience_fee) * CANCELLATION_FEE_RATE).toFixed(2));
  const cancellation_fee_gst = parseFloat((cancellation_fee * CANCELLATION_FEE_GST_RATE).toFixed(2));
  const total_canc_charge    = cancellation_fee + cancellation_fee_gst;
  const applied_tier_hours   = tier.hours_before;
  const isHighTier           = applied_tier_hours >= HIGH_TIER_CUTOFF_HOURS;

  let refund_to_user;
  if (isHighTier) {
    refund_to_user = parseFloat(Math.max(0, total_paid - total_canc_charge).toFixed(2));
  } else {
    const gross_refund = parseFloat((ticket_amount * (tier.refund_percent / 100)).toFixed(2));
    refund_to_user     = parseFloat(Math.max(0, gross_refund - total_canc_charge).toFixed(2));
  }

  return { cancellation_fee, cancellation_fee_gst, refund_to_user, applied_tier_hours, isHighTier };
};

const getEffectiveRevenue = (b) => {
  const isActive = !b.cancellation_status || b.cancellation_status === "active";
  if (isActive) {
    return {
      effective_ticket: b.ticket_amount, effective_conv: b.convenience_fee,
      effective_gst: b.gst_amount, effective_cancellation: 0,
      effective_total: b.total_paid, is_cancelled: false,
    };
  }

  const cancFee    = b.cancellation_fee     || 0;
  const cancFeeGst = b.cancellation_fee_gst || 0;
  const cancTotal  = cancFee + cancFeeGst;
  const refund     = b.refund_amount        || 0;
  const isHighTier = (b.applied_tier_hours  || 0) >= HIGH_TIER_CUTOFF_HOURS;

  if (refund === 0 && !isHighTier) {
    return {
      effective_ticket: b.ticket_amount, effective_conv: b.convenience_fee,
      effective_gst: b.gst_amount, effective_cancellation: 0,
      effective_total: b.total_paid, is_cancelled: true,
    };
  }

  if (isHighTier) {
    return {
      effective_ticket: 0, effective_conv: 0, effective_gst: 0,
      effective_cancellation: cancTotal, effective_total: cancTotal, is_cancelled: true,
    };
  }

  const netRetained      = b.total_paid - refund;
  const effective_conv   = b.convenience_fee;
  const effective_gst    = b.gst_amount;
  const effective_ticket = Math.max(0, netRetained - effective_conv - effective_gst - cancTotal);
  return {
    effective_ticket, effective_conv, effective_gst,
    effective_cancellation: cancTotal, effective_total: netRetained, is_cancelled: true,
  };
};

// ── Policy CRUD ──────────────────────────────────────────────────────────────
const upsertCancellationPolicy = async (organizerId, eventId, tiers, isCancellationAllowed = true) => {
  const event = await Event.findOne({ where: { id: eventId, organizer_id: organizerId } });
  if (!event) throw Object.assign(new Error("Event not found or you do not own this event."), { statusCode: 404 });

  if (!Array.isArray(tiers) || tiers.length === 0)
    throw Object.assign(new Error("At least one refund tier is required."), { statusCode: 400 });

  for (const tier of tiers) {
    if (typeof tier.hours_before !== "number" || typeof tier.refund_percent !== "number" ||
        tier.hours_before < 0 || tier.refund_percent < 0 || tier.refund_percent > 100)
      throw Object.assign(new Error("Each tier must have hours_before (≥ 0) and refund_percent (0–100)."), { statusCode: 400 });
  }

  const [policy] = await CancellationPolicy.upsert(
    { event_id: eventId, organizer_id: organizerId, tiers, is_cancellation_allowed: isCancellationAllowed },
    { returning: true }
  );
  logger.info("Cancellation policy upserted", { organizerId, eventId });
  return policy;
};

const getCancellationPolicy = async (eventId) =>
  await CancellationPolicy.findOne({ where: { event_id: eventId } });

// ── Preview ──────────────────────────────────────────────────────────────────
const previewCancellation = async (bookingId, userId) => {
  const booking = await Booking.findOne({
    where: { id: bookingId, user_id: userId },
    include: [{ model: Event, attributes: ["title", "event_date", "organizer_id"] }],
  });

  if (!booking) throw Object.assign(new Error("Booking not found."), { statusCode: 404 });
  if (booking.payment_status !== "paid")
    throw Object.assign(new Error("Only paid bookings can be cancelled."), { statusCode: 400 });
  if (booking.cancellation_status !== "active")
    throw Object.assign(new Error(`Booking is already ${booking.cancellation_status}.`), { statusCode: 400 });

  const policy = await getCancellationPolicy(booking.event_id);
  if (!policy || !policy.is_cancellation_allowed)
    return { cancellationAllowed: false, reason: "The organizer has not enabled cancellations for this event.", refundAmount: 0, refundPercent: 0 };

  const now             = new Date();
  const hoursUntilEvent = (new Date(booking.Event.event_date) - now) / (1000 * 60 * 60);
  if (hoursUntilEvent <= 0)
    return { cancellationAllowed: false, reason: "The event has already started or passed.", refundAmount: 0, refundPercent: 0 };

  const tier = matchTier(policy.tiers, hoursUntilEvent);
  if (!tier)
    return { cancellationAllowed: false, reason: "No matching refund tier for the current time.", refundAmount: 0, refundPercent: 0 };

  const bd = computeCancellationBreakdown(booking, tier);

  return {
    cancellationAllowed:  true,
    refundAmount:         bd.refund_to_user,
    refundPercent:        tier.refund_percent,
    cancellationFee:      bd.cancellation_fee,
    cancellationFeeGst:   bd.cancellation_fee_gst,
    isHighTier:           bd.isHighTier,
    appliedTierHours:     bd.applied_tier_hours,
    hoursUntilEvent:      Math.floor(hoursUntilEvent),
    totalPaid:            booking.total_paid,
    ticketAmount:         booking.ticket_amount,
    convenienceFee:       booking.convenience_fee,
    convenienceRetained:  !bd.isHighTier,
    policy:               policy.tiers,
  };
};

// ── Cancel + Refund ──────────────────────────────────────────────────────────
const cancelBooking = async (bookingId, userId) => {
  const preview = await previewCancellation(bookingId, userId);
  if (!preview.cancellationAllowed)
    throw Object.assign(new Error(preview.reason), { statusCode: 400 });

  return await sequelize.transaction(async (t) => {
    const booking = await Booking.findOne({
      where: { id: bookingId, user_id: userId },
      include: [{ model: Event }], lock: t.LOCK.UPDATE, transaction: t,
    });
    if (!booking) throw Object.assign(new Error("Booking not found."), { statusCode: 404 });
    if (booking.cancellation_status !== "active")
      throw Object.assign(new Error(`Booking already ${booking.cancellation_status}.`), { statusCode: 400 });

    const event = await Event.findByPk(booking.event_id, { lock: t.LOCK.UPDATE, transaction: t });
    event.available_tickets += booking.tickets_booked;
    await event.save({ transaction: t });

    let selectedSeats = [];
    try { selectedSeats = JSON.parse(booking.selected_seats || "[]"); } catch (_) {}
    if (selectedSeats.length > 0) await seatService.releaseSeats(booking.event_id, selectedSeats, t);

    let razorpay_refund_id      = null;
    let finalCancellationStatus = "cancelled";

    if (preview.refundAmount > 0 && booking.razorpay_payment_id) {
      try {
        const refund = await getRazorpayInstance().payments.refund(booking.razorpay_payment_id, {
          amount: Math.round(preview.refundAmount * 100),
          notes: { booking_id: String(bookingId), reason: "Customer cancellation" },
        });
        razorpay_refund_id      = refund.id;
        finalCancellationStatus = "refund_pending";
        logger.info("Razorpay refund initiated", { bookingId, refundId: refund.id, refundAmount: preview.refundAmount });
      } catch (err) {
        logger.error("Razorpay refund failed — booking still cancelled", { bookingId, error: err.message });
      }
    }

    await booking.update({
      cancellation_status:  finalCancellationStatus,
      refund_amount:        preview.refundAmount,
      razorpay_refund_id,
      cancelled_at:         new Date(),
      cancellation_fee:     preview.cancellationFee,
      cancellation_fee_gst: preview.cancellationFeeGst,
      applied_tier_hours:   preview.appliedTierHours,
    }, { transaction: t });

    logger.info("Booking cancelled", { bookingId, userId, refundAmount: preview.refundAmount, appliedTierHours: preview.appliedTierHours });

    return {
      booking, refundAmount: preview.refundAmount, refundPercent: preview.refundPercent,
      cancellationFee: preview.cancellationFee, cancellationFeeGst: preview.cancellationFeeGst,
      isHighTier: preview.isHighTier, cancellationStatus: finalCancellationStatus, razorpay_refund_id,
    };
  });
};

const markRefundComplete = async (razorpay_refund_id) => {
  const booking = await Booking.findOne({ where: { razorpay_refund_id } });
  if (!booking) { logger.warn("Refund webhook — booking not found", { razorpay_refund_id }); return null; }
  await booking.update({ cancellation_status: "refunded" });
  logger.info("Refund marked complete", { bookingId: booking.id, razorpay_refund_id });
  return booking;
};

module.exports = {
  upsertCancellationPolicy, getCancellationPolicy,
  previewCancellation, cancelBooking, markRefundComplete, getEffectiveRevenue,
};
