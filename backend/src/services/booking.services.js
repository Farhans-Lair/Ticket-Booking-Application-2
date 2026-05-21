/**
 * booking.services.js
 * Updated with Feature 3 (QR token) and Feature 4 (coupon redemption).
 */
const sequelize   = require("../config/database");
const { Event, Booking } = require("../models");
const seatService  = require("./seat.services");
const qrService    = require("./qr.services");
const couponService = require("./coupon.services");

const CONVENIENCE_FEE_RATE = 0.10;
const GST_RATE             = 0.09;

/* ─── Phase 1: calculate booking amount ──────────────────────────────────── */
const calculateBookingAmount = async (
  eventId, tickets_booked, selected_seats = [], couponCode = null, userId = null
) => {
  const event = await Event.findByPk(eventId);
  if (!event) throw new Error("Event not found");
  if (event.available_tickets < tickets_booked) throw new Error("Not enough tickets available");

  let ticketAmount;
  if (event.price === 0 && selected_seats.length > 0) {
    const { total } = await seatService.calculateTierPrice(eventId, selected_seats);
    ticketAmount = total;
  } else {
    ticketAmount = event.price * tickets_booked;
  }

  const convenienceFee = ticketAmount * CONVENIENCE_FEE_RATE;
  const gstAmount      = convenienceFee * GST_RATE;
  let   subtotal       = ticketAmount + convenienceFee + gstAmount;

  // Feature 4: preview discount without committing
  let discountAmount = 0;
  let couponValid    = null;
  if (couponCode && userId) {
    const check = await couponService.validate(couponCode, userId, subtotal);
    if (check.valid) {
      discountAmount = check.discountAmount;
      couponValid    = check;
    }
  }

  const totalPaid = Math.max(0, subtotal - discountAmount);

  return {
    event, ticketAmount, convenienceFee, gstAmount,
    discountAmount, totalPaid, couponValid,
  };
};

/* ─── Phase 2: confirm booking after payment ─────────────────────────────── */
const confirmBooking = async (
  userId, eventId, tickets_booked,
  razorpay_order_id, razorpay_payment_id,
  selected_seats = [], couponCode = null
) => {
  return sequelize.transaction(async (t) => {
    const event = await Event.findByPk(eventId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!event) throw new Error("Event not found");
    if (event.available_tickets < tickets_booked) throw new Error("Not enough tickets available");

    // Lock & book selected seats
    let bookedSeats = [];
    if (selected_seats.length > 0) {
      bookedSeats = await seatService.bookSeats(eventId, selected_seats, t);
    }

    event.available_tickets -= tickets_booked;
    await event.save({ transaction: t });

    // Price
    let ticketAmount;
    if (event.price === 0 && bookedSeats.length > 0) {
      ticketAmount = bookedSeats.reduce((sum, s) => sum + parseFloat(s.tier_price), 0);
    } else {
      ticketAmount = event.price * tickets_booked;
    }

    const convenienceFee = ticketAmount * CONVENIENCE_FEE_RATE;
    const gstAmount      = convenienceFee * GST_RATE;
    let   subtotal       = ticketAmount + convenienceFee + gstAmount;

    // Feature 4: atomically redeem coupon inside same transaction
    let discountAmount = 0;
    let appliedCoupon  = null;
    if (couponCode) {
      try {
        discountAmount = await couponService.redeem(couponCode, userId, subtotal, t);
        appliedCoupon  = couponCode;
      } catch (err) {
        // Coupon failed (expired, exhausted) — proceed without discount
        appliedCoupon = null;
        discountAmount = 0;
      }
    }

    const totalPaid = Math.max(0, subtotal - discountAmount);

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
      coupon_code:         appliedCoupon,
      discount_amount:     discountAmount,
    }, { transaction: t });

    // Feature 3: generate and store QR token after booking is persisted
    try {
      const qrToken = qrService.generateToken(booking.id, userId, eventId);
      await booking.update({ qr_token: qrToken }, { transaction: t });
    } catch (err) {
      // QR failure is non-fatal — booking is confirmed; QR can be regenerated
      console.error("QR token generation failed for booking", booking.id, err.message);
    }

    return booking;
  });
};

/* ─── User bookings ───────────────────────────────────────────────────────── */
const getUserBookings = async (userId) =>
  Booking.findAll({
    where:   { user_id: userId },
    include: [{ model: Event, attributes: ["title", "event_date", "price", "images"] }],
    order:   [["booking_date", "DESC"]],
  });

const getBookingById = async (bookingId, userId) =>
  Booking.findOne({
    where:   { id: bookingId, user_id: userId },
    include: [{ model: Event, attributes: ["title", "event_date", "price", "location"] }],
  });

module.exports = {
  calculateBookingAmount,
  confirmBooking,
  getUserBookings,
  getBookingById,
};
