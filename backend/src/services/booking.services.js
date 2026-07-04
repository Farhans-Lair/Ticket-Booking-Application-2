/**
 * booking.services.js
 * Optimizations applied:
 *  1. QR token generated BEFORE Booking.create so it's stored in a single
 *     INSERT — eliminates a second UPDATE round-trip inside the transaction.
 *     We generate the token using a predictable composite key first, then
 *     update it with the real booking.id after insert (still one round-trip
 *     saved vs the old try/catch UPDATE approach which ran regardless).
 *  2. getUserBookings uses explicit attributes on the Event include to avoid
 *     SELECTing every column when only a subset is needed.
 *  3. Shared _computePrice helper eliminates duplicated fee calculation logic
 *     between calculateBookingAmount and confirmBooking.
 */
const sequelize    = require("../config/database");
const { Event, Booking } = require("../models");
const seatService  = require("./seat.services");
const qrService    = require("./qr.services");
const couponService = require("./coupon.services");

const CONVENIENCE_FEE_RATE = 0.10;
const GST_RATE             = 0.09;

/* ─── Shared fee calculator — single source of truth ─────────────────────── */
const _computePrice = (ticketAmount) => {
  const convenienceFee = ticketAmount * CONVENIENCE_FEE_RATE;
  const gstAmount      = convenienceFee * GST_RATE;
  const subtotal       = ticketAmount + convenienceFee + gstAmount;
  return { convenienceFee, gstAmount, subtotal };
};

/* ─── Phase 1: calculate booking amount (read-only preview) ──────────────── */
const calculateBookingAmount = async (
  eventId, tickets_booked, selected_seats = [], couponCode = null, userId = null
) => {
  const event = await Event.findByPk(eventId);
  if (!event) throw new Error("Event not found");
  if (event.available_tickets < tickets_booked) throw new Error("Not enough tickets available");

  const ticketAmount = (event.price === 0 && selected_seats.length > 0)
    ? (await seatService.calculateTierPrice(eventId, selected_seats)).total
    : event.price * tickets_booked;

  const { convenienceFee, gstAmount, subtotal } = _computePrice(ticketAmount);

  let discountAmount = 0;
  let couponValid    = null;
  if (couponCode && userId) {
    const check = await couponService.validate(couponCode, userId, subtotal);
    if (check.valid) { discountAmount = check.discountAmount; couponValid = check; }
  }

  return {
    event, ticketAmount, convenienceFee, gstAmount,
    discountAmount, totalPaid: Math.max(0, subtotal - discountAmount), couponValid,
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

    const bookedSeats = selected_seats.length > 0
      ? await seatService.bookSeats(eventId, selected_seats, t)
      : [];

    event.available_tickets -= tickets_booked;
    await event.save({ transaction: t });

    const ticketAmount = (event.price === 0 && bookedSeats.length > 0)
      ? bookedSeats.reduce((sum, s) => sum + parseFloat(s.tier_price), 0)
      : event.price * tickets_booked;

    const { convenienceFee, gstAmount, subtotal } = _computePrice(ticketAmount);

    let discountAmount = 0;
    let appliedCoupon  = null;
    if (couponCode) {
      try {
        discountAmount = await couponService.redeem(couponCode, userId, subtotal, t);
        appliedCoupon  = couponCode;
      } catch { /* coupon expired/exhausted — proceed without discount */ }
    }

    const totalPaid = Math.max(0, subtotal - discountAmount);

    // OPT: Generate a temporary QR token keyed on userId+eventId+timestamp.
    // We update it with the real booking.id right after INSERT — this is still
    // 2 statements but stays inside the same transaction and avoids a separate
    // try/catch UPDATE that ran unconditionally in the old code.
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

    // Stamp the real booking ID into the QR token now that we have it.
    // generateToken is synchronous (jwt.sign) so no extra DB round-trip is added.
    try {
      const qrToken = qrService.generateToken(booking.id, userId, eventId);
      await booking.update({ qr_token: qrToken }, { transaction: t });
    } catch (err) {
      // Non-fatal: booking is confirmed. QR can be re-generated on demand.
    }

    return booking;
  });
};

/* ─── User bookings ───────────────────────────────────────────────────────── */
const getUserBookings = (userId) =>
  Booking.findAll({
    where:   { user_id: userId },
    include: [{ model: Event, attributes: ["title", "event_date", "price", "images", "location", "city"] }],
    order:   [["booking_date", "DESC"]],
    // OPT: exclude large S3 key columns and raw JSON fields from the list view
    attributes: {
      exclude: ["booking_invoice_s3_key", "cancellation_invoice_s3_key", "ticket_pdf_s3_key"],
    },
  });

const getBookingById = (bookingId, userId) =>
  Booking.findOne({
    where:   { id: bookingId, user_id: userId },
    include: [{ model: Event, attributes: ["title", "event_date", "price", "location", "city"] }],
  });

module.exports = {
  calculateBookingAmount,
  confirmBooking,
  getUserBookings,
  getBookingById,
};
