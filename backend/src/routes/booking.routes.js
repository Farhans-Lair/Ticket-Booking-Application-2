
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

// View my bookings (protected)
router.get(
  "/my-bookings",
  authenticate,
  (req, res, next) => bookingController.getMyBookings(req, res, next)
);

module.exports = router;
