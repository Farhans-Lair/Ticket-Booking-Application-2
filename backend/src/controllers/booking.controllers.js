const bookingService = require("../services/booking.services");
const { User, Event } = require("../models");
const { generateTicketPDF } = require("../services/email.service");

// GET /bookings/my-bookings — fetch logged-in user's bookings
const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const bookings = await bookingService.getUserBookings(userId);
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

// GET /bookings/:id/download-ticket — download PDF ticket for a booking
const downloadTicket = async (req, res, next) => {
  try {
    const userId    = req.user.id;
    const bookingId = parseInt(req.params.id, 10);

    const booking = await bookingService.getBookingById(bookingId, userId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const user  = await User.findByPk(userId);
    const event = await Event.findByPk(booking.event_id);

    const pdfBuffer = await generateTicketPDF(booking, user, event);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="ticket-${booking.id}.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    next(err);
  }
};

module.exports = { getMyBookings, downloadTicket };