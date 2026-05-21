/**
 * checkin.controllers.js — Feature 3: QR-code check-in
 *
 * POST /organizer/checkin
 *   body: { "token": "<JWT from QR code>" }
 *
 * Flow:
 *   1. Verify JWT signature
 *   2. Load booking
 *   3. Validate paid + active + not already checked in
 *   4. Stamp checked_in = true, checked_in_at = now
 *   5. Return confirmation
 */
const { Booking } = require("../models");
const qrService   = require("../services/qr.services");
const logger      = require("../config/logger");

const checkIn = async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ success: false, reason: "Token is required." });

    // Step 1: Verify JWT
    let payload;
    try {
      payload = qrService.verifyToken(token);
    } catch (e) {
      logger.warn("Check-in failed — invalid token", { error: e.message });
      return res.status(401).json({ success: false, reason: "Invalid or expired QR code." });
    }

    const bookingId = parseInt(payload.sub, 10);
    const { userId, eventId } = payload;

    // Step 2: Load booking
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      logger.warn("Check-in failed — booking not found", { bookingId });
      return res.status(404).json({ success: false, reason: "Booking not found." });
    }

    // Step 3: Validate state
    if (booking.payment_status !== "paid")
      return res.status(422).json({ success: false, reason: "Booking is not paid." });

    if (booking.cancellation_status !== "active")
      return res.status(422).json({ success: false, reason: `Booking is ${booking.cancellation_status}.` });

    if (booking.checked_in) {
      logger.warn("Check-in attempted on already-checked-in booking", { bookingId });
      return res.status(409).json({
        success:        false,
        reason:         "Ticket already scanned.",
        checked_in_at:  booking.checked_in_at,
      });
    }

    // Step 4: Mark checked in
    await booking.update({ checked_in: true, checked_in_at: new Date() });

    logger.info("Check-in successful", { bookingId, userId, eventId });

    // Step 5: Confirm
    res.json({
      success:        true,
      booking_id:     bookingId,
      user_id:        userId,
      event_id:       eventId,
      tickets_booked: booking.tickets_booked,
      selected_seats: booking.selected_seats || "[]",
      checked_in_at:  booking.checked_in_at,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { checkIn };
