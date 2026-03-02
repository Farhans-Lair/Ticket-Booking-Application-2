const express        = require("express");
const router         = express.Router();
const authenticate   = require("../middleware/auth.middleware");
const seatController = require("../controllers/seat.controllers");

// Get all seats for an event (protected)
router.get(
  "/:eventId",
  authenticate,
  (req, res, next) => seatController.getSeats(req, res, next)
);

module.exports = router;
