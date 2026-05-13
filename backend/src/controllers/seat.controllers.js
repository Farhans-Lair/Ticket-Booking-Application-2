const seatService = require("../services/seat.services");
const logger      = require("../config/logger");

/*
====================================================
 GET /seats/:eventId
 Returns all seats for an event with tier info.
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
 Returns tier summary + all seats grouped for UI.
 FIX Issue 4: new endpoint for seat-selection page
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
 Assign seat tiers after event creation.
 Body: { tiers: [{ name, price, rows }] }
 FIX Issue 4: organizer can configure tiers post-creation
====================================================
*/
const assignSeatTiers = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { tiers }   = req.body;

    if (!Array.isArray(tiers) || !tiers.length) {
      return res.status(400).json({ error: "tiers array is required." });
    }

    // Pass organizerId for ownership check; admin has no organizerId check
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

module.exports = { getSeats, getSeatTiers, assignSeatTiers };
