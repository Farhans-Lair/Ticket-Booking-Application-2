const sequelize   = require("../config/database");
const { Event, Booking } = require("../models");
const seatService = require("./seat.services");

const CONVENIENCE_FEE_RATE = 0.10;
const GST_RATE             = 0.09;

/*
====================================================
 PHASE 1 — CALCULATE BOOKING AMOUNT
 FIX Issue 4: uses tier_price when event.price === 0
====================================================
*/
const calculateBookingAmount = async (eventId, tickets_booked, selected_seats = []) => {
  const event = await Event.findByPk(eventId);
  if (!event) throw new Error("Event not found");
  if (event.available_tickets < tickets_booked) throw new Error("Not enough tickets available");

  let ticketAmount;

  // Tier-based pricing: event.price === 0, price is per-seat
  if (event.price === 0 && selected_seats.length > 0) {
    const { total } = await seatService.calculateTierPrice(eventId, selected_seats);
    ticketAmount = total;
  } else {
    ticketAmount = event.price * tickets_booked;
  }

  const convenienceFee = ticketAmount * CONVENIENCE_FEE_RATE;
  const gstAmount      = convenienceFee * GST_RATE;
  const totalPaid      = ticketAmount + convenienceFee + gstAmount;

  return { event, ticketAmount, convenienceFee, gstAmount, totalPaid };
};

/*
====================================================
 PHASE 2 — CONFIRM BOOKING AFTER PAYMENT SUCCESS
 FIX Issue 4: also handles tier price calculation
====================================================
*/
const confirmBooking = async (
  userId, eventId, tickets_booked,
  razorpay_order_id, razorpay_payment_id, selected_seats = []
) => {
  return await sequelize.transaction(async (t) => {
    const event = await Event.findByPk(eventId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!event) throw new Error("Event not found");
    if (event.available_tickets < tickets_booked) throw new Error("Not enough tickets available");

    // Lock & book selected seats
    let bookedSeats = [];
    if (selected_seats.length > 0) {
      bookedSeats = await seatService.bookSeats(eventId, selected_seats, t);
    }

    // Deduct available tickets
    event.available_tickets -= tickets_booked;
    await event.save({ transaction: t });

    // Price — tier-based if event.price === 0
    let ticketAmount;
    if (event.price === 0 && bookedSeats.length > 0) {
      ticketAmount = bookedSeats.reduce((sum, s) => sum + parseFloat(s.tier_price), 0);
    } else {
      ticketAmount = event.price * tickets_booked;
    }

    const convenienceFee = ticketAmount * CONVENIENCE_FEE_RATE;
    const gstAmount      = convenienceFee * GST_RATE;
    const totalPaid      = ticketAmount + convenienceFee + gstAmount;

    const booking = await Booking.create({
      user_id:             userId,
      event_id:            eventId,
      tickets_booked,
      ticket_amount:       ticketAmount,
      convenience_fee:     convenienceFee,
      gst_amount:          gstAmount,
      total_paid:          totalPaid,
      selected_seats:      JSON.stringify(selected_seats),
      razorpay_order_id,
      razorpay_payment_id,
      payment_status:      "paid",
    }, { transaction: t });

    return booking;
  });
};

/*
====================================================
 USER BOOKINGS VIEW
====================================================
*/
const getUserBookings = async (userId) => {
  return Booking.findAll({
    where: { user_id: userId },
    include: [{ model: Event, attributes: ["title", "event_date", "price", "images"] }],
    order: [["booking_date", "DESC"]],
  });
};

const getBookingById = async (bookingId, userId) => {
  return Booking.findOne({
    where: { id: bookingId, user_id: userId },
    include: [{ model: Event, attributes: ["title", "event_date", "price", "location"] }],
  });
};

module.exports = { calculateBookingAmount, confirmBooking, getUserBookings, getBookingById };
