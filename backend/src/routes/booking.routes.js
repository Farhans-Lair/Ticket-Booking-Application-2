
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const bookingController = require("../controllers/booking.controllers");

// View my bookings (protected)
router.get(
  "/my-bookings",
  authenticate,
  (req, res, next) => bookingController.getMyBookings(req, res, next)
);

module.exports = router;
