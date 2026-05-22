const seatService = require("../services/seat.services");
const logger      = require("../config/logger");

/*
====================================================
 GET /seats/:eventId
====================================================
*/
const getSeats = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    logger.info("Fetching seats for event", { userId: req.user?.id, eventId });
    const seats = await seatService.getSeatsByEvent(eventId);
    logger.info("Seats fetched", { eventId, count: seats.length });
    res.json(seats);
  } catch (err) {
    logger.error("Failed to fetch seats", { eventId: req.params?.eventId, error: err.message });
    next(err);
  }
};

/*
====================================================
 GET /seats/:eventId/tiers
====================================================
*/
const getSeatTiers = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const data = await seatService.getSeatTiers(eventId);
    res.json(data);
  } catch (err) {
    logger.error("Failed to fetch seat tiers", { eventId: req.params?.eventId, error: err.message });
    next(err);
  }
};

/*
====================================================
 PUT /seats/:eventId/tiers
====================================================
*/
const assignSeatTiers = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { tiers }   = req.body;

    if (!Array.isArray(tiers) || !tiers.length) {
      return res.status(400).json({ error: "tiers array is required." });
    }

    const organizerId = req.user.role === "admin" ? null : req.user.id;
    const seats = await seatService.assignSeatTiers(eventId, organizerId, tiers);

    logger.info("Seat tiers assigned", { eventId, userId: req.user.id, tiers: tiers.map(t => t.name) });
    res.json({ message: "Seat tiers assigned.", seats });
  } catch (err) {
    logger.error("Seat tier assignment failed", { eventId: req.params?.eventId, error: err.message });
    err.statusCode = err.message.includes("not found") ? 404 : 400;
    next(err);
  }
};

/*
====================================================
 POST /seats/:eventId/hold  — Feature 1
 Body: { seatNumbers: ["A1", "A2"] }
 Locks seats for 10 minutes for the authenticated user.
====================================================
*/
const holdSeats = async (req, res, next) => {
  try {
    const { eventId }     = req.params;
    const { seatNumbers } = req.body;
    const userId          = req.user.id;

    if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({ error: "seatNumbers array is required." });
    }

    const result = await seatService.holdSeats(eventId, seatNumbers, userId);

    logger.info("Seats held", { eventId, userId, seats: seatNumbers });
    res.json({
      message:     "Seats held for 10 minutes.",
      seatNumbers: result.seatNumbers,
      heldUntil:   result.heldUntil,
      heldForMins: 10,
    });
  } catch (err) {
    logger.error("Seat hold failed", { eventId: req.params?.eventId, error: err.message });
    err.statusCode = err.message.includes("no longer available") ? 409 : 400;
    next(err);
  }
};

module.exports = { getSeats, getSeatTiers, assignSeatTiers, holdSeats };
