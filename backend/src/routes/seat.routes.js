const express        = require("express");
const router         = express.Router();
const authenticate   = require("../middleware/auth.middleware");
const seatController = require("../controllers/seat.controllers");

router.get("/:eventId",        authenticate, seatController.getSeats);

router.get("/:eventId/tiers",  authenticate, seatController.getSeatTiers);

router.put("/:eventId/tiers",  authenticate, seatController.assignSeatTiers);

router.post("/:eventId/hold",  authenticate, seatController.holdSeats);

module.exports = router;
