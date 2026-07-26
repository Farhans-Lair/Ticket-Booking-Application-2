const express  = require("express");
const router   = express.Router();
const authenticate      = require("../middleware/auth.middleware");
const bookingController = require("../controllers/booking.controllers");

router.get(
  "/my-bookings",
  authenticate,
  (req, res, next) => bookingController.getMyBookings(req, res, next)
);

router.get(
  "/:id/download-ticket",
  authenticate,
  (req, res, next) => bookingController.downloadTicket(req, res, next)
);

router.get(
  "/:id/download-invoice",
  authenticate,
  (req, res, next) => bookingController.downloadBookingInvoice(req, res, next)
);

router.get(
  "/:id/qr",
  authenticate,
  (req, res, next) => bookingController.getQrCode(req, res, next)
);

module.exports = router;
