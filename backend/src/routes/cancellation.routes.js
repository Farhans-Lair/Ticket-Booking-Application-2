const express      = require("express");
const router       = express.Router();
const authenticate = require("../middleware/auth.middleware");
const authorizeOrganizer = require("../middleware/authorizeOrganizer");
const cancellationController = require("../controllers/cancellation.controllers");

// ──────────────────────────────────────────────────────────────────────────────
// WEBHOOK (no auth — Razorpay calls this)
// Must be registered BEFORE express.json() parses the body,
// but since app.js already applies express.json() globally we accept
// the parsed body and re-stringify for HMAC verification.
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/webhook/refund",
  (req, res, next) => cancellationController.handleRefundWebhook(req, res, next)
);

// ──────────────────────────────────────────────────────────────────────────────
// USER ROUTES (any logged-in user)
// ──────────────────────────────────────────────────────────────────────────────

// Preview: how much refund would I get if I cancel now?
router.get(
  "/preview/:bookingId",
  authenticate,
  (req, res, next) => cancellationController.previewCancellation(req, res, next)
);

// Cancel a booking
router.post(
  "/:bookingId",
  authenticate,
  (req, res, next) => cancellationController.cancelBooking(req, res, next)
);

// ──────────────────────────────────────────────────────────────────────────────
// SHARED ROUTE — readable by both users and organizers
// ──────────────────────────────────────────────────────────────────────────────

// Get policy for an event (used in event detail and organizer dashboard)
router.get(
  "/policy/:eventId",
  authenticate,
  (req, res, next) => cancellationController.getPolicy(req, res, next)
);

// ──────────────────────────────────────────────────────────────────────────────
// ORGANIZER ROUTES
// ──────────────────────────────────────────────────────────────────────────────

// Create / update policy for an event
router.put(
  "/policy/:eventId",
  authenticate,
  authorizeOrganizer,
  (req, res, next) => cancellationController.upsertPolicy(req, res, next)
);

module.exports = router;
