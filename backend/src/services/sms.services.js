/**
 * sms.services.js
 * Dynamic multi-user SMS via Twilio with sender caching.
 *
 * Required .env vars:
 *   TWILIO_ACCOUNT_SID           — from https://console.twilio.com
 *   TWILIO_AUTH_TOKEN            — from https://console.twilio.com
 *   TWILIO_MESSAGING_SERVICE_SID — MG... from your Messaging Service
 *   TWILIO_PHONE_NUMBER          — +1... (kept in pool to avoid 21704)
 *
 * Optional:
 *   APP_BASE_URL  — base URL for links e.g. http://localhost:3000
 */

const logger = require("../config/logger");

let twilioClient = null;

// In-memory sender cache: maps normalised destination number → sender that worked
// e.g. { "+917028178725" → "59039149" }
// Persists for the lifetime of the Node process — survives across all requests
const senderCache = new Map();

// Twilio error codes where Indian carrier blocked the sender
const INDIA_BLOCK_CODES = ["30044", "21606", "21408"];

function getClient() {
  if (twilioClient) return twilioClient;
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  twilioClient = require("twilio")(sid, token);
  return twilioClient;
}

function getBaseUrl() {
  return (process.env.APP_BASE_URL || process.env.FRONTEND_URL || "http://localhost:3000")
    .replace(/\/$/, "");
}

function normalisePhone(phone) {
  let n = phone.trim().replace(/\s+/g, "");
  if (/^\d{10}$/.test(n)) n = `+91${n}`;
  return n;
}

function isIndianNumber(normalised) {
  return normalised.startsWith("+91") && normalised.length === 13;
}

// ── Core send with automatic retry and sender caching ────────────────────────
async function sendSMS(toPhone, body) {
  const client              = getClient();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!client || !messagingServiceSid) {
    logger.warn("SMS skipped — Twilio credentials not configured", { toPhone });
    return;
  }

  if (!toPhone) {
    logger.warn("SMS skipped — user has no phone number on record");
    return;
  }

  const normalised = normalisePhone(toPhone);
  const isIndia    = isIndianNumber(normalised);
  const cached     = senderCache.get(normalised);

  // ── Attempt 1 ─────────────────────────────────────────────────────────────
  // If we have a cached sender that worked before, use it directly.
  // Otherwise let the Messaging Service auto-pick the sender.
  const attempt1 = cached && isIndia
    ? { from: cached, to: normalised, body }
    : { messagingServiceSid, to: normalised, body };

  try {
    const msg = await client.messages.create(attempt1);

    // Cache the sender that worked so all future SMS to this number
    // always use the same route — works for any number of users
    if (msg.from && !senderCache.has(normalised)) {
      senderCache.set(normalised, msg.from);
      logger.info("Sender cached", { to: normalised, sender: msg.from });
    }

    logger.info("SMS sent", {
      sid: msg.sid,
      to:  normalised,
      via: cached ? `cached:${cached}` : "MessagingService",
    });
    return; // ✅ success

  } catch (err) {
    const code           = err.code ? String(err.code) : "";
    const isCarrierBlock = INDIA_BLOCK_CODES.includes(code);

    if (!isIndia || !isCarrierBlock) {
      // Not an India carrier block — no retry, just log and move on
      logger.error("SMS send failed", { to: normalised, error: err.message, code });
      return;
    }

    // ── Attempt 2 (India carrier block only) ──────────────────────────────
    // The Messaging Service picked the US number (+19783076585) which Indian
    // carriers block. Clear the bad cached sender and retry — Twilio will
    // pick a different sender from the pool (the short code 59039149).
    logger.warn("India carrier blocked sender — retrying via Messaging Service", {
      to:            normalised,
      blockedSender: attempt1.from || "MessagingService",
      code,
    });

    senderCache.delete(normalised);

    try {
      const msg2 = await client.messages.create({
        messagingServiceSid,
        to: normalised,
        body,
      });

      // Cache the new working sender
      if (msg2.from) {
        senderCache.set(normalised, msg2.from);
        logger.info("Sender cached after retry", {
          to: normalised, sender: msg2.from,
        });
      }

      logger.info("SMS sent on retry", { sid: msg2.sid, to: normalised });

    } catch (retryErr) {
      logger.error("SMS retry also failed", {
        to:    normalised,
        error: retryErr.message,
        code:  retryErr.code,
      });
    }
  }
}

// ── Booking confirmation SMS ──────────────────────────────────────────────────
async function sendBookingConfirmationSMS(user, booking, event) {
  if (!user?.phone) return;

  const date = new Date(event.event_date).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  const bookingsUrl = `${getBaseUrl()}/user-bookings`;

  const body =
    `Booking Confirmed!\n` +
    `Event: ${event.title}\n` +
    `Date: ${date}\n` +
    `Venue: ${event.location || "TBA"}\n` +
    `Tickets: ${booking.tickets_booked}\n` +
    `Total Paid: Rs.${parseFloat(booking.total_paid).toFixed(2)}\n` +
    `Booking ID: #${booking.id}\n` +
    `View ticket: ${bookingsUrl}\n` +
    `- TicketVerse`;

  await sendSMS(user.phone, body);
}

// ── Booking cancellation SMS ──────────────────────────────────────────────────
async function sendCancellationSMS(user, booking, event, refundAmount) {
  if (!user?.phone) return;

  const refund      = parseFloat(refundAmount || 0).toFixed(2);
  const bookingsUrl = `${getBaseUrl()}/user-bookings`;

  const body =
    `Booking Cancelled\n` +
    `Event: ${event.title}\n` +
    `Booking ID: #${booking.id}\n` +
    `Refund: Rs.${refund}\n` +
    `Refunds processed within 5-7 business days.\n` +
    `View bookings: ${bookingsUrl}\n` +
    `- TicketVerse`;

  await sendSMS(user.phone, body);
}

module.exports = { sendBookingConfirmationSMS, sendCancellationSMS };
