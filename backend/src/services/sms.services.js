/**
 * sms.services.js
 * Sends SMS notifications via Twilio.
 * Falls back gracefully (logs warning) when Twilio credentials are absent
 * so the app never crashes if SMS is not configured.
 *
 * Required .env vars:
 *   TWILIO_ACCOUNT_SID          — from https://console.twilio.com
 *   TWILIO_AUTH_TOKEN           — from https://console.twilio.com
 *
 * Use ONE of the following (Messaging Service SID takes priority):
 *   TWILIO_MESSAGING_SERVICE_SID — recommended (MG...)
 *   TWILIO_PHONE_NUMBER          — fallback direct number (+1xxxxxxxxxx)
 */

const logger = require("../config/logger");

let twilioClient = null;

function getClient() {
  if (twilioClient) return twilioClient;
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  twilioClient = require("twilio")(sid, token);
  return twilioClient;
}

async function sendSMS(toPhone, body) {
  const client              = getClient();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber          = process.env.TWILIO_PHONE_NUMBER;

  if (!client || (!messagingServiceSid && !fromNumber)) {
    logger.warn("SMS skipped — Twilio credentials not configured", { toPhone });
    return;
  }

  if (!toPhone) {
    logger.warn("SMS skipped — user has no phone number on record");
    return;
  }

  // Normalise Indian numbers: 10-digit → +91xxxxxxxxxx
  let normalised = toPhone.trim().replace(/\s+/g, "");
  if (/^\d{10}$/.test(normalised)) normalised = `+91${normalised}`;

  // Messaging Service SID takes priority over direct phone number
  const params = messagingServiceSid
    ? { messagingServiceSid, to: normalised, body }
    : { from: fromNumber,    to: normalised, body };

  try {
    const msg = await client.messages.create(params);
    logger.info("SMS sent", {
      sid: msg.sid, to: normalised,
      via: messagingServiceSid ? "MessagingService" : "DirectNumber",
    });
  } catch (err) {
    logger.error("SMS send failed", { to: normalised, error: err.message });
  }
}

async function sendBookingConfirmationSMS(user, booking, event) {
  if (!user?.phone) return;

  const date = new Date(event.event_date).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  const body =
    `✅ Booking Confirmed!\n` +
    `Event: ${event.title}\n` +
    `Date: ${date}\n` +
    `Venue: ${event.location || "TBA"}\n` +
    `Tickets: ${booking.tickets_booked}\n` +
    `Total Paid: ₹${parseFloat(booking.total_paid).toFixed(2)}\n` +
    `Booking ID: #${booking.id}\n` +
    `- TicketVerse`;

  await sendSMS(user.phone, body);
}

async function sendCancellationSMS(user, booking, event, refundAmount) {
  if (!user?.phone) return;

  const refund = parseFloat(refundAmount || 0).toFixed(2);

  const body =
    `❌ Booking Cancelled\n` +
    `Event: ${event.title}\n` +
    `Booking ID: #${booking.id}\n` +
    `Refund Amount: ₹${refund}\n` +
    `Refunds are processed within 5–7 business days.\n` +
    `- TicketVerse`;

  await sendSMS(user.phone, body);
}

module.exports = { sendBookingConfirmationSMS, sendCancellationSMS };
