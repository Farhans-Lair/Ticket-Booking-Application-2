/**
 * waitlist.services.js — Feature 7: Waitlist for sold-out events
 */
const { WaitlistEntry, Event, User } = require("../models");
const { Op } = require("sequelize");
const logger = require("../config/logger");

/* ─── Join ────────────────────────────────────────────────────────────────── */
const join = async (userId, eventId, ticketsWanted = 1) => {
  const event = await Event.findByPk(eventId);
  if (!event) throw new Error("Event not found.");

  const existing = await WaitlistEntry.findOne({ where: { user_id: userId, event_id: eventId } });
  if (existing) throw new Error("You are already on the waitlist for this event.");

  const entry = await WaitlistEntry.create({
    user_id:       userId,
    event_id:      eventId,
    tickets_wanted: ticketsWanted,
    status:        "waiting",
  });

  logger.info("Waitlist joined", { userId, eventId, ticketsWanted });
  return entry;
};

/* ─── Leave ───────────────────────────────────────────────────────────────── */
const leave = async (userId, eventId) => {
  await WaitlistEntry.destroy({ where: { user_id: userId, event_id: eventId } });
  logger.info("Waitlist left", { userId, eventId });
};

/* ─── User's waitlist ─────────────────────────────────────────────────────── */
const getForUser = (userId) =>
  WaitlistEntry.findAll({
    where: { user_id: userId },
    include: [{ model: Event, attributes: ["id", "title", "event_date", "city"] }],
    order: [["joined_at", "DESC"]],
  });

/* ─── Queue stats (public) ────────────────────────────────────────────────── */
const getQueueStats = async (eventId) => {
  const count = await WaitlistEntry.count({ where: { event_id: eventId, status: "waiting" } });
  return { waitlist_count: count, event_id: eventId };
};

/* ─── Notify next waiter after a cancellation ─────────────────────────────── */
const notifyNextWaiter = async (eventId, freedSeats) => {
  const eligible = await WaitlistEntry.findAll({
    where: { event_id: eventId, status: "waiting", tickets_wanted: { [Op.lte]: freedSeats } },
    include: [{ model: User, attributes: ["email", "name"] }],
    order: [["joined_at", "ASC"]],
    limit: 1,
  });
  if (eligible.length === 0) return;

  const event = await Event.findByPk(eventId);
  if (!event) return;

  const first = eligible[0];
  try {
    const { sendSimple } = require("./email.services");
    await sendSimple(
      first.User.email,
      `Your waitlist spot is ready: ${event.title}`,
      `Hi ${first.User.name},\n\n` +
      `${freedSeats} ticket(s) for "${event.title}" on ${event.event_date.toDateString()} just became available.\n` +
      `You were first in line — book now: https://yourapp.com/events/${event.id}\n\n` +
      `Note: Seats are not reserved; first come, first served.\n\nTicketApp Team`
    );
    await first.update({ status: "notified", notified_at: new Date() });
    logger.info("Waitlist notification sent", { userId: first.user_id, eventId });
  } catch (err) {
    logger.error("Waitlist notification failed", { userId: first.user_id, eventId, error: err.message });
  }
};

module.exports = { join, leave, getForUser, getQueueStats, notifyNextWaiter };
