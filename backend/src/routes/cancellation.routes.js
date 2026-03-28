const express      = require("express");
const router       = express.Router();
const authenticate = require("../middleware/auth.middleware");
const authorizeOrganizer = require("../middleware/authorizeOrganizer");
const cancellationController = require("../controllers/cancellation.controllers");

// ── WEBHOOK (no auth — Razorpay calls this) ───────────────────────────────────
router.post(
  "/webhook/refund",
  (req, res, next) => cancellationController.handleRefundWebhook(req, res, next)
);

// ── USER ROUTES ───────────────────────────────────────────────────────────────

// Preview refund before cancelling
router.get(
  "/preview/:bookingId",
  authenticate,
  (req, res, next) => cancellationController.previewCancellation(req, res, next)
);

// Cancel a booking — also triggers cancellation invoice generation
router.post(
  "/:bookingId",
  authenticate,
  (req, res, next) => cancellationController.cancelBooking(req, res, next)
);

// Download cancellation invoice PDF
// Generated when booking is cancelled (booking-cancelled event).
router.get(
  "/:bookingId/download-invoice",
  authenticate,
  (req, res, next) => cancellationController.downloadCancellationInvoice(req, res, next)
);

// ── SHARED (user + organizer) ─────────────────────────────────────────────────

router.get(
  "/policy/:eventId",
  authenticate,
  (req, res, next) => cancellationController.getPolicy(req, res, next)
);

// ── ORGANIZER ROUTES ──────────────────────────────────────────────────────────

router.put(
  "/policy/:eventId",
  authenticate,
  authorizeOrganizer,
  (req, res, next) => cancellationController.upsertPolicy(req, res, next)
);

module.exports = router;
