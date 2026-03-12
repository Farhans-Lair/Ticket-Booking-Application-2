const bookingService = require("../services/booking.services");
const { User, Event } = require("../models");
const { generateTicketPDF } = require("../services/email.services");
const logger           = require("../config/logger");


// GET /bookings/my-bookings — fetch logged-in user's bookings
const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    logger.info("Fetching user bookings", { userId });
    const bookings = await bookingService.getUserBookings(userId);
    logger.info("User bookings fetched", { userId, count: bookings.length })
    res.json(bookings);
  } catch (err) {
    logger.error("Failed to fetch user bookings", {
      userId: req.user?.id,
      error:  err.message,
    });
    next(err);
  }
};

// GET /bookings/:id/download-ticket — download PDF ticket for a booking
const downloadTicket = async (req, res, next) => {
  try {
    const userId    = req.user.id;
    const bookingId = parseInt(req.params.id, 10);

    logger.info("Ticket download requested", { userId, bookingId });


    const booking = await bookingService.getBookingById(bookingId, userId);
    if (!booking) {
      logger.warn("Ticket download failed — booking not found", { userId, bookingId });
      return res.status(404).json({ error: "Booking not found" });
    }

    const user  = await User.findByPk(userId);
    const event = await Event.findByPk(booking.event_id);

    const pdfBuffer = await generateTicketPDF(booking, user, event);

    logger.info("Ticket PDF generated and sent", { userId, bookingId, eventId: booking.event_id });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="ticket-${booking.id}.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    logger.error("Ticket download failed", {
      userId:    req.user?.id,
      bookingId: req.params?.id,
      error:     err.message,
    });

    next(err);
  }
};

module.exports = { getMyBookings, downloadTicket };