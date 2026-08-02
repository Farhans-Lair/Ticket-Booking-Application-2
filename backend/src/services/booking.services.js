const sequelize    = require("../config/database");
const { Event, Booking } = require("../models");
const seatService  = require("./seat.services");
const qrService    = require("./qr.services");
const couponService = require("./coupon.services");

// Configurable via env vars so fee/tax rates can change without a code
// deploy — same pattern as PLATFORM_FEE_RATE in payout.services.js.
const CONVENIENCE_FEE_RATE = parseFloat(process.env.CONVENIENCE_FEE_RATE || "0.10");
const GST_RATE             = parseFloat(process.env.GST_RATE || "0.09");

const _computePrice = (ticketAmount) => {
  const convenienceFee = ticketAmount * CONVENIENCE_FEE_RATE;
  const gstAmount      = convenienceFee * GST_RATE;
  const subtotal       = ticketAmount + convenienceFee + gstAmount;
  return { convenienceFee, gstAmount, subtotal };
};

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
      } catch {  }
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

    try {
      const qrToken = qrService.generateToken(booking.id, userId, eventId);
      await booking.update({ qr_token: qrToken }, { transaction: t });
    } catch (err) {

    }

    return booking;
  });
};

const getUserBookings = (userId) =>
  Booking.findAll({
    where:   { user_id: userId },
    include: [{ model: Event, attributes: ["title", "event_date", "price", "images", "location", "city"] }],
    order:   [["booking_date", "DESC"]],

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
