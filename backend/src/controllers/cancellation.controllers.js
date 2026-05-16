const cancellationService = require("../services/cancellation.services");
const bookingService      = require("../services/booking.services");
const { User, Event }     = require("../models");
const {
  generateCancellationInvoicePDF,
  sendCancellationInvoiceEmail,
} = require("../services/email.services");
const { uploadInvoiceToS3, fetchInvoiceFromS3 } = require("../services/s3.services");
const logger = require("../config/logger");
const { sendCancellationSMS } = require("../services/sms.services");
const crypto = require("crypto");

// ──────────────────────────────────────────────────────────────────────────────
// USER ENDPOINTS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /cancellations/preview/:bookingId
 * Returns the refund amount the user would receive if they cancel now.
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
      userId: req.user?.id, bookingId: req.params?.bookingId, error: err.message,
    });
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

/**
 * POST /cancellations/:bookingId
 * Cancels a booking, initiates a Razorpay refund, and generates a
 * cancellation invoice PDF — triggered by the cancellation event.
 */
const cancelBooking = async (req, res, next) => {
  try {
    const userId    = req.user.id;
    const bookingId = parseInt(req.params.bookingId, 10);

    logger.info("Booking cancellation requested", { userId, bookingId });

    const result = await cancellationService.cancelBooking(bookingId, userId);

    // ── Fetch user + event for invoice generation ────────────────────────────
    const user  = await User.findByPk(userId);
    const event = await Event.findByPk(result.booking.event_id);

    // ── Generate cancellation invoice PDF → upload to S3 ────────────────────
    // Triggered by the booking-cancelled event (cancelBooking).
    // Failure does NOT affect the cancellation outcome.
    try {
      logger.info("Generating cancellation invoice PDF", { userId, bookingId });

      const invoiceBuffer = await generateCancellationInvoicePDF(
        result.booking, user, event, result
      );
      const invoiceS3Key = await uploadInvoiceToS3(
        invoiceBuffer, bookingId, userId, "cancellation"
      );
      await result.booking.update({ cancellation_invoice_s3_key: invoiceS3Key });

      logger.info("Cancellation invoice stored in S3", {
        userId, bookingId, invoiceS3Key,
      });
    } catch (invErr) {
      logger.error("Cancellation invoice upload failed (booking still cancelled)", {
        userId, bookingId, error: invErr.message,
      });
    }

    // ── Send cancellation invoice email ──────────────────────────────────────
    // Separate email with the A4 cancellation invoice — triggered by cancellation event.
    try {
      logger.info("Sending cancellation invoice email", {
        userId, email: user?.email, bookingId,
      });
      await sendCancellationInvoiceEmail(user, result.booking, event, result);
      logger.info("Cancellation invoice email sent", {
        userId, email: user?.email, bookingId,
      });
      // ── SMS cancellation notification ───────────────────────────────────
      sendCancellationSMS(user, result.booking, event, result.refund_amount).catch(e =>
        logger.error("Cancellation SMS failed", { bookingId, error: e.message })
      );
    } catch (emailErr) {
      logger.error("Cancellation invoice email failed (booking still cancelled)", {
        userId, bookingId, error: emailErr.message,
      });
    }

    res.json({
      message:            "Booking cancelled successfully.",
      refundAmount:       result.refundAmount,
      refundPercent:      result.refundPercent,
      cancellationStatus: result.cancellationStatus,
      razorpay_refund_id: result.razorpay_refund_id,
    });

  } catch (err) {
    logger.error("Booking cancellation failed", {
      userId: req.user?.id, bookingId: req.params?.bookingId, error: err.message,
    });
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

/**
 * GET /cancellations/:bookingId/download-invoice
 * Download the cancellation invoice PDF for a booking.
 * Streams from S3 if available, otherwise generates on-the-fly.
 */
const downloadCancellationInvoice = async (req, res, next) => {
  try {
    const userId    = req.user.id;
    const bookingId = parseInt(req.params.bookingId, 10);

    logger.info("Cancellation invoice download requested", { userId, bookingId });

    const booking = await bookingService.getBookingById(bookingId, userId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (!["cancelled", "refund_pending", "refunded"].includes(booking.cancellation_status)) {
      return res.status(400).json({ error: "No cancellation invoice exists for an active booking." });
    }

    let pdfBuffer;

    if (booking.cancellation_invoice_s3_key) {
      logger.info("Serving cancellation invoice from S3", {
        userId, bookingId, s3Key: booking.cancellation_invoice_s3_key,
      });
      pdfBuffer = await fetchInvoiceFromS3(booking.cancellation_invoice_s3_key);
    } else {
      logger.warn("cancellation_invoice_s3_key missing — generating on-the-fly", {
        userId, bookingId,
      });
      const user  = await User.findByPk(userId);
      const event = await Event.findByPk(booking.event_id);
      pdfBuffer   = await generateCancellationInvoicePDF(booking, user, event, {
        refundAmount:       booking.refund_amount,
        cancellationFee:    booking.cancellation_fee,
        cancellationFeeGst: booking.cancellation_fee_gst,
        isHighTier:         (booking.applied_tier_hours || 0) >= 72,
        cancellationStatus: booking.cancellation_status,
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="cancellation-invoice-${bookingId}.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    logger.error("Cancellation invoice download failed", {
      userId: req.user?.id, bookingId: req.params?.bookingId, error: err.message,
    });
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// ORGANIZER ENDPOINTS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /cancellations/policy/:eventId
 */
const getPolicy = async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const policy  = await cancellationService.getCancellationPolicy(eventId);

    if (!policy) {
      return res.json({ exists: false, is_cancellation_allowed: false, tiers: [] });
    }
    res.json({ exists: true, ...policy.toJSON() });
  } catch (err) {
    logger.error("Get cancellation policy failed", {
      eventId: req.params?.eventId, error: err.message,
    });
    next(err);
  }
};

/**
 * PUT /cancellations/policy/:eventId
 */
const upsertPolicy = async (req, res, next) => {
  try {
    const organizerId = req.user.id;
    const eventId     = parseInt(req.params.eventId, 10);
    const { tiers, is_cancellation_allowed = true } = req.body;

    if (!tiers) {
      return res.status(400).json({ error: "tiers array is required." });
    }

    logger.info("Cancellation policy upsert requested", {
      organizerId, eventId, tiers, is_cancellation_allowed,
    });

    const policy = await cancellationService.upsertCancellationPolicy(
      organizerId, eventId, tiers, is_cancellation_allowed
    );

    res.json({ message: "Cancellation policy saved.", policy });
  } catch (err) {
    logger.error("Upsert cancellation policy failed", {
      organizerId: req.user?.id, eventId: req.params?.eventId, error: err.message,
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
 */
const handleRefundWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      const signature = req.headers["x-razorpay-signature"];
      const body      = JSON.stringify(req.body);
      const expected  = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");

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
  downloadCancellationInvoice,
  getPolicy,
  upsertPolicy,
  handleRefundWebhook,
};
