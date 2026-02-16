const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const bookingController = require("../controllers/booking.controllers");


// Book tickets (protected)
router.post("/", authenticate, bookingController.createBooking);

// View my bookings (protected)
router.get("/my-bookings", authenticate, bookingController.getMyBookings);

module.exports = router;
