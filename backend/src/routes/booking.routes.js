const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/booking.controllers");
const authenticate = require("../middleware/auth.middleware");

// Book tickets (protected)
router.post("/", authenticate, bookingController.createBooking);

// View my bookings (protected)
router.get("/me", authenticate, bookingController.getMyBookings);

module.exports = router;
