/**
 * reminder.services.js  —  Feature 3: Event Reminder Emails
 *
 * Schedules a daily cron job that:
 *  1. Finds all upcoming events starting within the next 24 hours.
 *  2. Finds all PAID, ACTIVE bookings for those events where
 *     reminder_sent = 0 (not yet notified).
 *  3. Sends a reminder email to each user.
 *  4. Marks the booking's reminder_sent = 1 so they aren't emailed twice.
 *
 * Import and call startReminderScheduler() once from server.js.
 */

const cron        = require("node-cron");
const nodemailer  = require("nodemailer");
const { Op }      = require("sequelize");
const { Booking, Event, User } = require("../models");
const logger      = require("../config/logger");

// ── Mail transporter (shared with email.services.js) ─────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function fmtDate(date) {
  return new Date(date).toLocaleString("en-IN", {
    weekday: "long", year: "numeric", month: "long",
    day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function buildReminderHtml(user, event, booking) {
  const seats = (() => {
    try { return JSON.parse(booking.selected_seats || "[]").join(", ") || "General Admission"; }
    catch { return "General Admission"; }
  })();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #0f0f1a; color: #f0eee8; margin: 0; padding: 0; }
    .wrap { max-width: 600px; margin: 32px auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #6c63ff, #a78bfa); padding: 36px 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; color: #fff; }
    .header p  { margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px; }
    .body { padding: 32px; }
    .label { font-size: 11px; color: #a78bfa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .value { font-size: 15px; color: #f0eee8; margin-bottom: 20px; }
    .highlight { background: rgba(108,99,255,0.15); border-left: 4px solid #6c63ff; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; }
    .btn { display: inline-block; background: #6c63ff; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .footer { text-align: center; padding: 20px 32px; font-size: 12px; color: #5a5a7a; border-top: 1px solid rgba(255,255,255,0.06); }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>⏰ Your Event is Tomorrow!</h1>
      <p>Don't miss out — here's everything you need</p>
    </div>
    <div class="body">
      <p style="font-size:16px; margin-bottom:24px;">Hi <strong>${user.name}</strong>,</p>
      <div class="highlight">
        <div class="label">Event</div>
        <div style="font-size:20px; font-weight:700; color:#a78bfa; margin-bottom:8px;">${event.title}</div>
        <div class="label">Date &amp; Time</div>
        <div class="value">${fmtDate(event.event_date)}</div>
      </div>
      <div class="label">Venue</div>
      <div class="value">${event.location || "Venue TBA"}</div>
      <div class="label">Booking ID</div>
      <div class="value">#${booking.id}</div>
      <div class="label">Tickets</div>
      <div class="value">${booking.tickets_booked} × ticket(s)</div>
      <div class="label">Seats</div>
      <div class="value">${seats}</div>
      <div style="margin-top:8px;">
        <a class="btn" href="${process.env.FRONTEND_URL || "http://localhost:3000"}/my-bookings">View My Booking</a>
      </div>
    </div>
    <div class="footer">TicketVerse · You're receiving this because you booked tickets for this event.</div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// CORE JOB — send reminders for events in the next 24 hours
// ─────────────────────────────────────────────────────────────
async function sendEventReminders() {
  logger.info("[Reminder] Starting reminder scan…");

  const now       = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Events happening in the next 24 hours
  const upcomingEvents = await Event.findAll({
    where: {
      status:     "approved",
      event_date: { [Op.between]: [now, in24Hours] },
    },
    attributes: ["id", "title", "event_date", "location"],
  });

  if (!upcomingEvents.length) {
    logger.info("[Reminder] No upcoming events in next 24 hours.");
    return;
  }

  const eventIds = upcomingEvents.map((e) => e.id);

  // Paid, active bookings for those events that haven't had a reminder sent
  const bookings = await Booking.findAll({
    where: {
      event_id:             { [Op.in]: eventIds },
      payment_status:       "paid",
      cancellation_status:  "active",
      reminder_sent:        0,
    },
    include: [
      { model: User,  attributes: ["id", "name", "email"] },
      { model: Event, attributes: ["id", "title", "event_date", "location"] },
    ],
  });

  logger.info(`[Reminder] Sending reminders for ${bookings.length} booking(s).`);

  let sent = 0;
  for (const booking of bookings) {
    try {
      await transporter.sendMail({
        from:    `"TicketVerse" <${process.env.EMAIL_USER}>`,
        to:      booking.User.email,
        subject: `⏰ Reminder: "${booking.Event.title}" is tomorrow!`,
        html:    buildReminderHtml(booking.User, booking.Event, booking),
      });

      // Mark reminder sent to avoid duplicate emails
      await booking.update({ reminder_sent: 1 });
      sent++;
    } catch (emailErr) {
      logger.error("[Reminder] Failed to send reminder", {
        bookingId: booking.id,
        userId:    booking.User?.id,
        error:     emailErr.message,
      });
    }
  }

  logger.info(`[Reminder] Done — ${sent}/${bookings.length} reminders sent.`);
}

// ─────────────────────────────────────────────────────────────
// SCHEDULER — run every day at 9:00 AM
// ─────────────────────────────────────────────────────────────
function startReminderScheduler() {
  if (process.env.NODE_ENV === "test") return;   // skip in test environment

  // "0 9 * * *"  → at 09:00 every day
  cron.schedule("0 9 * * *", async () => {
    try {
      await sendEventReminders();
    } catch (err) {
      logger.error("[Reminder] Scheduler job failed", { error: err.message });
    }
  });

  logger.info("[Reminder] Scheduler registered — daily at 09:00.");
}

module.exports = { startReminderScheduler, sendEventReminders };
