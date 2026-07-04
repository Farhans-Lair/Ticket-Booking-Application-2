const { Event, Booking } = require("../models");
const { getEffectiveRevenue } = require("../services/cancellation.services");
const logger = require("../config/logger");

const getRevenue = async (req, res, next) => {
  try {
    logger.info("Revenue report requested", { adminId: req.user?.id });

    const events = await Event.findAll({
      include: [{
        model: Booking,
        attributes: [
          "id", "tickets_booked", "ticket_amount", "convenience_fee",
          "gst_amount", "total_paid", "payment_status", "cancellation_status",
          "refund_amount", "cancellation_fee", "cancellation_fee_gst",
          "applied_tier_hours", "booking_date",
        ],
      }],
    });

    const eventsWithBookings = events.filter(
      e => e.Bookings && e.Bookings.some(b => b.payment_status === "paid")
    );

    // Attach effective revenue breakdown to each booking
    const result = eventsWithBookings.map(event => {
      const enrichedBookings = event.Bookings
        .filter(b => b.payment_status === "paid")
        .map(b => {
          const eff = getEffectiveRevenue(b);
          return { ...b.toJSON(), ...eff };
        });

      const eventTotals = enrichedBookings.reduce((acc, b) => {
        acc.effective_ticket       += b.effective_ticket;
        acc.effective_conv         += b.effective_conv;
        acc.effective_gst          += b.effective_gst;
        acc.effective_cancellation += b.effective_cancellation;
        acc.effective_total        += b.effective_total;
        acc.tickets_sold           += b.tickets_booked;
        return acc;
      }, { effective_ticket: 0, effective_conv: 0, effective_gst: 0, effective_cancellation: 0, effective_total: 0, tickets_sold: 0 });

      return {
        ...event.toJSON(),
        Bookings:    enrichedBookings,
        eventTotals,
      };
    });

    const grandTotals = result.reduce((acc, e) => {
      acc.effective_ticket       += e.eventTotals.effective_ticket;
      acc.effective_conv         += e.eventTotals.effective_conv;
      acc.effective_gst          += e.eventTotals.effective_gst;
      acc.effective_cancellation += e.eventTotals.effective_cancellation;
      acc.effective_total        += e.eventTotals.effective_total;
      acc.tickets_sold           += e.eventTotals.tickets_sold;
      return acc;
    }, { effective_ticket: 0, effective_conv: 0, effective_gst: 0, effective_cancellation: 0, effective_total: 0, tickets_sold: 0 });

    logger.info("Revenue report generated", {
      adminId: req.user?.id, eventsCount: result.length, grandTotal: grandTotals.effective_total.toFixed(2),
    });

    res.json({ events: result, grandTotals });

  } catch (err) {
    logger.error("Revenue report failed", { adminId: req.user?.id, error: err.message });
    next(err);
  }
};

module.exports = { getRevenue };
