/**
 * wishlist.services.js — Feature 6: Wishlist / save event
 */
const { Wishlist, Event, User } = require("../models");
const logger = require("../config/logger");

/* ─── Save / update ───────────────────────────────────────────────────────── */
const save = async (userId, eventId, notifyOnAvailability = false) => {
  await Event.findByPk(eventId)
    .then(e => { if (!e) throw new Error("Event not found."); });

  const [entry, created] = await Wishlist.findOrCreate({
    where: { user_id: userId, event_id: eventId },
    defaults: { notify_on_availability: notifyOnAvailability },
  });

  if (!created) {
    await entry.update({ notify_on_availability: notifyOnAvailability });
  }

  logger.info("Wishlist saved", { userId, eventId, notify: notifyOnAvailability });
  return entry;
};

/* ─── Remove ──────────────────────────────────────────────────────────────── */
const remove = async (userId, eventId) => {
  await Wishlist.destroy({ where: { user_id: userId, event_id: eventId } });
  logger.info("Wishlist removed", { userId, eventId });
};

/* ─── Get user wishlist ───────────────────────────────────────────────────── */
const getForUser = (userId) =>
  Wishlist.findAll({
    where: { user_id: userId },
    include: [{ model: Event, attributes: ["id", "title", "event_date", "price", "city", "images"] }],
    order: [["saved_at", "DESC"]],
  });

/* ─── Notify availability subscribers (after cancellation frees a seat) ──── */
const notifyAvailabilitySubscribers = async (eventId) => {
  const subscribers = await Wishlist.findAll({
    where: { event_id: eventId, notify_on_availability: true },
    include: [{ model: User, attributes: ["email", "name"] }],
  });
  if (subscribers.length === 0) return;

  const event = await Event.findByPk(eventId);
  if (!event) return;

  // Lazy-require email service to avoid circular deps
  const { sendSimple } = require("./email.services");

  for (const w of subscribers) {
    try {
      await sendSimple(
        w.User.email,
        `Tickets now available: ${event.title}`,
        `Hi ${w.User.name},\n\nA ticket for "${event.title}" just opened up.\n` +
        `Book now before it's gone: https://yourapp.com/events/${event.id}\n\nTicketApp Team`
      );
      await w.update({ notify_on_availability: false });
      logger.info("Wishlist availability notification sent", { userId: w.user_id, eventId });
    } catch (err) {
      logger.error("Wishlist notification failed", { userId: w.user_id, eventId, error: err.message });
    }
  }
};

module.exports = { save, remove, getForUser, notifyAvailabilitySubscribers };
