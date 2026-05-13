const express        = require("express");
const router         = express.Router();
const authenticate   = require("../middleware/auth.middleware");
const seatController = require("../controllers/seat.controllers");

// GET  /seats/:eventId          → all seats with status + tier info
router.get("/:eventId",       authenticate, seatController.getSeats);

// GET  /seats/:eventId/tiers    → tier summary + grouped seats (FIX Issue 4)
router.get("/:eventId/tiers", authenticate, seatController.getSeatTiers);

// PUT  /seats/:eventId/tiers    → assign tiers to seat rows (organizer or admin)
router.put("/:eventId/tiers", authenticate, seatController.assignSeatTiers);

module.exports = router;
