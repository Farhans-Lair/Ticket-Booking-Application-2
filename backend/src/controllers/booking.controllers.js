const bookingService = require("../services/booking.services");

const createBooking = async (req, res, next) => {
  try {
    const userId = req.user.id;   // from auth middleware
    // Parse both as integers — req.body values arrive as strings
    const event_id = parseInt(req.body.event_id, 10);
    const tickets_booked = parseInt(req.body.tickets_booked, 10);


    if (!event_id || !tickets_booked || tickets_booked <= 0) {
      return res.status(400).json({
        error: "Valid event_id and quantity required"
      });
    }

    const booking = await bookingService.createBooking(
      userId,
      event_id,
      tickets_booked
    );

    res.status(201).json({
      message: "Booking successful",
      booking
    });

  } catch (err) {
    err.statusCode = 400;
    next(err);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const bookings = await bookingService.getUserBookings(userId);

    res.json(bookings);

  } catch (err) {
    next(err);
  }
};


module.exports = {
  createBooking,
  getMyBookings
};
