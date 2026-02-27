const sequelize = require("../config/database");
const { Event, Booking } = require("../models");

// Constants extracted — easy to update in one place
const CONVENIENCE_FEE_PER_TICKET = 20;
const GST_RATE = 0.18;

/*
====================================================
 PHASE 1 — CALCULATE BOOKING AMOUNT
 Called before payment. Does NOT write to DB.
 Returns price breakdown + event info for Razorpay order.
====================================================
*/

const calculateBookingAmount = async (eventId, tickets_booked) => {
  const event = await Event.findByPk(eventId);

  if (!event) {
    throw new Error("Event not found");
  }

  if (event.available_tickets < tickets_booked) {
    throw new Error("Not enough tickets available");
  }

  const ticketAmount   = event.price * tickets_booked;
  const convenienceFee = CONVENIENCE_FEE_PER_TICKET * tickets_booked;
  const gstAmount      = convenienceFee * GST_RATE;
  const totalPaid      = ticketAmount + convenienceFee + gstAmount;

  return {
    event,
    ticketAmount,
    convenienceFee,
    gstAmount,
    totalPaid,
  };
};


/*
====================================================
 PHASE 2 — CONFIRM BOOKING AFTER PAYMENT SUCCESS
 Called after Razorpay signature verification.
 Deducts tickets + writes booking to DB atomically.
====================================================
*/

const confirmBooking = async (
  userId,
  eventId,
  tickets_booked,
  razorpay_order_id,
  razorpay_payment_id
) => {
  return await sequelize.transaction(async (t) => {

    const event = await Event.findByPk(eventId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!event) throw new Error("Event not found");
    if (event.available_tickets < tickets_booked)
      throw new Error("Not enough tickets available");

    // Deduct tickets
    event.available_tickets -= tickets_booked;
    await event.save({ transaction: t });

    // Revenue calculation (mirrors Phase 1)
    const ticketAmount   = event.price * tickets_booked;
    const convenienceFee = CONVENIENCE_FEE_PER_TICKET * tickets_booked;
    const gstAmount      = convenienceFee * GST_RATE;
    const totalPaid      = ticketAmount + convenienceFee + gstAmount;

    // Create booking with payment info
    const booking = await Booking.create(
      {
        user_id:             userId,
        event_id:            eventId,
        tickets_booked,
        ticket_amount:       ticketAmount,
        convenience_fee:     convenienceFee,
        gst_amount:          gstAmount,
        total_paid:          totalPaid,
        razorpay_order_id,
        razorpay_payment_id,
        payment_status:      "paid",
      },
      { transaction: t }
    );

    return booking;
  });
};

/*
====================================================
 USER BOOKINGS VIEW
====================================================
*/

const getUserBookings = async (userId) => {
  return await Booking.findAll({
    where: { user_id: userId },
    include: [{
      model: Event,
      attributes: ["title", "event_date", "price"]
    }],
    order: [["booking_date", "DESC"]]
  });
};

module.exports = {
  calculateBookingAmount,
  confirmBooking,
  getUserBookings
};
