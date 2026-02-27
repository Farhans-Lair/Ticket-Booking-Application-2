const bookingService = require("../services/booking.services");

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
  getMyBookings
};
