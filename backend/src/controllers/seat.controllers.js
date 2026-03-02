const seatService = require("../services/seat.services");

/*
====================================================
 GET /seats/:eventId
 Returns all seats for an event with their status.
====================================================
*/
const getSeats = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const seats = await seatService.getSeatsByEvent(eventId);
    res.json(seats);
  } catch (err) {
    next(err);
  }
};

module.exports = { getSeats };
