<<<<<<< HEAD
const express  = require("express");
const router   = express.Router();
const authenticate      = require("../middleware/auth.middleware");
const bookingController = require("../controllers/booking.controllers");

=======

const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const bookingController = require("../controllers/booking.controllers");

// Create booking (protected)
router.post(
  "/",
  authenticate,
  (req, res, next) => bookingController.createBooking(req, res, next)
);

>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
// View my bookings (protected)
router.get(
  "/my-bookings",
  authenticate,
  (req, res, next) => bookingController.getMyBookings(req, res, next)
);

<<<<<<< HEAD
// Download ticket PDF (protected)
router.get(
  "/:id/download-ticket",
  authenticate,
  (req, res, next) => bookingController.downloadTicket(req, res, next)
);

// Download booking invoice PDF (protected)
// Generated when payment is verified (booking-confirmed event).
router.get(
  "/:id/download-invoice",
  authenticate,
  (req, res, next) => bookingController.downloadBookingInvoice(req, res, next)
);

// GET /bookings/:id/qr — serve QR code as a PNG image (protected)
router.get(
  "/:id/qr",
  authenticate,
  (req, res, next) => bookingController.getQrCode(req, res, next)
);

=======
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
module.exports = router;
