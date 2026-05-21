/**
 * seat.routes.js — updated with Feature 1: seat hold
 */
const express        = require("express");
const router         = express.Router();
const authenticate   = require("../middleware/auth.middleware");
const seatController = require("../controllers/seat.controllers");

// GET  /seats/:eventId            → all seats with status + tier info
router.get("/:eventId",        authenticate, seatController.getSeats);

// GET  /seats/:eventId/tiers      → tier summary + grouped seats
router.get("/:eventId/tiers",  authenticate, seatController.getSeatTiers);

// PUT  /seats/:eventId/tiers      → assign tiers (organizer or admin)
router.put("/:eventId/tiers",  authenticate, seatController.assignSeatTiers);

// POST /seats/:eventId/hold       → Feature 1: temp-lock seats for 10 min
router.post("/:eventId/hold",  authenticate, seatController.holdSeats);

module.exports = router;
