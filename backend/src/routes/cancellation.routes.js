const express      = require("express");
const router       = express.Router();
const authenticate = require("../middleware/auth.middleware");
const authorizeOrganizer = require("../middleware/authorizeOrganizer");
const cancellationController = require("../controllers/cancellation.controllers");

router.post(
  "/webhook/refund",
  (req, res, next) => cancellationController.handleRefundWebhook(req, res, next)
);

router.get(
  "/preview/:bookingId",
  authenticate,
  (req, res, next) => cancellationController.previewCancellation(req, res, next)
);

router.post(
  "/:bookingId",
  authenticate,
  (req, res, next) => cancellationController.cancelBooking(req, res, next)
);

router.get(
  "/:bookingId/download-invoice",
  authenticate,
  (req, res, next) => cancellationController.downloadCancellationInvoice(req, res, next)
);

router.get(
  "/policy/:eventId",
  authenticate,
  (req, res, next) => cancellationController.getPolicy(req, res, next)
);

router.put(
  "/policy/:eventId",
  authenticate,
  authorizeOrganizer,
  (req, res, next) => cancellationController.upsertPolicy(req, res, next)
);

module.exports = router;
