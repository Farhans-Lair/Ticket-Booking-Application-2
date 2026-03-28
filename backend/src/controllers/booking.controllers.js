const bookingService = require("../services/booking.services");
const { User, Event } = require("../models");
const {
  generateTicketPDF,
  generateBookingInvoicePDF,
} = require("../services/email.services");
const {
  fetchTicketFromS3,
  fetchInvoiceFromS3,
} = require("../services/s3.services");
const logger = require("../config/logger");


// GET /bookings/my-bookings — fetch logged-in user's bookings
const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    logger.info("Fetching user bookings", { userId });
    const bookings = await bookingService.getUserBookings(userId);
    logger.info("User bookings fetched", { userId, count: bookings.length });
    res.json(bookings);
  } catch (err) {
    logger.error("Failed to fetch user bookings", {
      userId: req.user?.id, error: err.message,
    });
    next(err);
  }
};

// GET /bookings/:id/download-ticket
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

    let pdfBuffer;

    if (booking.ticket_pdf_s3_key) {
      logger.info("Serving ticket PDF from S3", { userId, bookingId, s3Key: booking.ticket_pdf_s3_key });
      pdfBuffer = await fetchTicketFromS3(booking.ticket_pdf_s3_key);
    } else {
      logger.warn("ticket_pdf_s3_key missing — generating on-the-fly", { userId, bookingId });
      const user  = await User.findByPk(userId);
      const event = await Event.findByPk(booking.event_id);
      pdfBuffer   = await generateTicketPDF(booking, user, event);
    }

    logger.info("Ticket PDF served", { userId, bookingId });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="ticket-${booking.id}.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    logger.error("Ticket download failed", {
      userId: req.user?.id, bookingId: req.params?.id, error: err.message,
    });
    next(err);
  }
};

/**
 * GET /bookings/:id/download-invoice
 * Download the booking invoice PDF.
 * Streams from S3 if available, otherwise generates on-the-fly.
 */
const downloadBookingInvoice = async (req, res, next) => {
  try {
    const userId    = req.user.id;
    const bookingId = parseInt(req.params.id, 10);

    logger.info("Booking invoice download requested", { userId, bookingId });

    const booking = await bookingService.getBookingById(bookingId, userId);
    if (!booking) {
      logger.warn("Booking invoice download failed — booking not found", { userId, bookingId });
      return res.status(404).json({ error: "Booking not found" });
    }

    let pdfBuffer;

    if (booking.booking_invoice_s3_key) {
      logger.info("Serving booking invoice from S3", {
        userId, bookingId, s3Key: booking.booking_invoice_s3_key,
      });
      pdfBuffer = await fetchInvoiceFromS3(booking.booking_invoice_s3_key);
    } else {
      logger.warn("booking_invoice_s3_key missing — generating on-the-fly", { userId, bookingId });
      const user  = await User.findByPk(userId);
      const event = await Event.findByPk(booking.event_id);
      pdfBuffer   = await generateBookingInvoicePDF(booking, user, event);
    }

    logger.info("Booking invoice served", { userId, bookingId });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-booking-${booking.id}.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    logger.error("Booking invoice download failed", {
      userId: req.user?.id, bookingId: req.params?.id, error: err.message,
    });
    next(err);
  }
};

module.exports = { getMyBookings, downloadTicket, downloadBookingInvoice };
