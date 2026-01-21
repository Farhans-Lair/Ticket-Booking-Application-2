const bookingService = require("../services/booking.services");

const createBooking = async (req, res, next) => {
  try {
    const userId = req.user.userId; // from JWT
    const { event_id, tickets } = req.body;

    if (!event_id || !tickets) {
      const err = new Error("event_id and tickets are required");
      err.statusCode = 400;
      throw err;
    }

    const booking = await bookingService.bookTickets(
      userId,
      event_id,
      tickets
    );

    res.status(201).json(booking);
  } catch (err) {
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

module.exports = {
  createBooking,
};

const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const bookings = await bookingService.getUserBookings(userId);
    res.json(bookings);
  } catch (err) {
    err.statusCode = 500;
    next(err);
  }
};
module.exports = {
  createBooking,
  getMyBookings,
};

