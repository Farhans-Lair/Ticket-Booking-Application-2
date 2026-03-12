const seatService = require("../services/seat.services");
const logger      = require("../config/logger");


/*
====================================================
 GET /seats/:eventId
 Returns all seats for an event with their status.
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
    logger.error("Failed to fetch seats", {
      userId:  req.user?.id,
      eventId: req.params?.eventId,
      error:   err.message,
    });
    next(err);
  }
};

module.exports = { getSeats };
