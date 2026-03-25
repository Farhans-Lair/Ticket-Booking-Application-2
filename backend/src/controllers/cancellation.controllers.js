const cancellationService = require("../services/cancellation.services");
const logger = require("../config/logger");
const crypto = require("crypto");

// ──────────────────────────────────────────────────────────────────────────────
// USER ENDPOINTS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /cancellations/preview/:bookingId
 * Returns the refund amount the user would receive if they cancel now.
 * No mutation — safe to call repeatedly.
 */
const previewCancellation = async (req, res, next) => {
  try {
    const userId    = req.user.id;
    const bookingId = parseInt(req.params.bookingId, 10);

    logger.info("Cancellation preview requested", { userId, bookingId });

    const result = await cancellationService.previewCancellation(bookingId, userId);

    res.json(result);
  } catch (err) {
    logger.error("Cancellation preview failed", {
      userId:    req.user?.id,
      bookingId: req.params?.bookingId,
      error:     err.message,
    });
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

/**
 * POST /cancellations/:bookingId
 * Cancels a booking and initiates a Razorpay refund.
 */
const cancelBooking = async (req, res, next) => {
  try {
    const userId    = req.user.id;
    const bookingId = parseInt(req.params.bookingId, 10);

    logger.info("Booking cancellation requested", { userId, bookingId });

    const result = await cancellationService.cancelBooking(bookingId, userId);

    res.json({
      message:            "Booking cancelled successfully.",
      refundAmount:       result.refundAmount,
      refundPercent:      result.refundPercent,
      cancellationStatus: result.cancellationStatus,
      razorpay_refund_id: result.razorpay_refund_id,
    });
  } catch (err) {
    logger.error("Booking cancellation failed", {
      userId:    req.user?.id,
      bookingId: req.params?.bookingId,
      error:     err.message,
    });
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// ORGANIZER ENDPOINTS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /cancellations/policy/:eventId
 * Returns the current cancellation policy for an event.
 * Accessible by the organizer who owns the event and by users (to preview before buying).
 */
const getPolicy = async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const policy  = await cancellationService.getCancellationPolicy(eventId);

    if (!policy) {
      return res.json({
        exists: false,
        is_cancellation_allowed: false,
        tiers: [],
      });
    }

    res.json({ exists: true, ...policy.toJSON() });
  } catch (err) {
    logger.error("Get cancellation policy failed", {
      eventId: req.params?.eventId,
      error:   err.message,
    });
    next(err);
  }
};

/**
 * PUT /cancellations/policy/:eventId
 * Create or update the cancellation policy for an event.
 * Only the organizer who owns the event may call this.
 */
const upsertPolicy = async (req, res, next) => {
  try {
    const organizerId            = req.user.id;
    const eventId                = parseInt(req.params.eventId, 10);
    const { tiers, is_cancellation_allowed = true } = req.body;

    if (!tiers) {
      return res.status(400).json({ error: "tiers array is required." });
    }

    logger.info("Cancellation policy upsert requested", {
      organizerId,
      eventId,
      tiers,
      is_cancellation_allowed,
    });

    const policy = await cancellationService.upsertCancellationPolicy(
      organizerId,
      eventId,
      tiers,
      is_cancellation_allowed
    );

    res.json({ message: "Cancellation policy saved.", policy });
  } catch (err) {
    logger.error("Upsert cancellation policy failed", {
      organizerId: req.user?.id,
      eventId:     req.params?.eventId,
      error:       err.message,
    });
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// RAZORPAY WEBHOOK
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /cancellations/webhook/refund
 * Razorpay fires this when a refund.processed event occurs.
 * Verifies the webhook signature then marks the booking as 'refunded'.
 */
const handleRefundWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      // Verify Razorpay signature
      const signature = req.headers["x-razorpay-signature"];
      const body      = JSON.stringify(req.body);
      const expected  = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");

      if (signature !== expected) {
        logger.warn("Refund webhook — invalid signature");
        return res.status(400).json({ error: "Invalid webhook signature." });
      }
    }

    const event = req.body;

    if (event.event === "refund.processed") {
      const refundId = event?.payload?.refund?.entity?.id;

      if (refundId) {
        const booking = await cancellationService.markRefundComplete(refundId);
        if (booking) {
          logger.info("Refund webhook processed", { bookingId: booking.id, refundId });
        }
      }
    }

    res.json({ status: "ok" });
  } catch (err) {
    logger.error("Refund webhook handler failed", { error: err.message });
    next(err);
  }
};

module.exports = {
  previewCancellation,
  cancelBooking,
  getPolicy,
  upsertPolicy,
  handleRefundWebhook,
};
