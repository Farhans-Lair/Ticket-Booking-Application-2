/**
 * organizer.controllers.js
 *
 * Updated for Feature 4 (Moderation): organizer-created events now start as
 * status='pending' and are only visible publicly after admin approval.
 * Feature 5 (Payouts): organizer can view their own payout history via
 * GET /organizer/payouts (handled in admin.controllers.js, mounted in routes).
 */

const organizerService = require("../services/organizer.services");
const eventService     = require("../services/event.services");
const logger           = require("../config/logger");

// ─────────────────────────────────────────────────────────────
// ORGANIZER — PROFILE
// ─────────────────────────────────────────────────────────────

const getProfile = async (req, res, next) => {
  try {
    const profile = await organizerService.getProfile(req.user.id);
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    res.json(profile);
  } catch (err) {
    logger.error("Failed to fetch organizer profile", { userId: req.user?.id, error: err.message });
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = await organizerService.updateProfile(req.user.id, req.body);
    logger.info("Organizer profile updated", { userId: req.user.id });
    res.json(profile);
  } catch (err) {
    logger.error("Organizer profile update failed", { userId: req.user?.id, error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// ORGANIZER — EVENTS
// ─────────────────────────────────────────────────────────────

const getMyEvents = async (req, res, next) => {
  try {
    const events = await organizerService.getOrganizerEvents(req.user.id);
    logger.info("Organizer events fetched", { organizerId: req.user.id, count: events.length });
    res.json(events);
  } catch (err) {
    logger.error("Failed to fetch organizer events", { organizerId: req.user?.id, error: err.message });
    next(err);
  }
};

/**
 * POST /organizer/events
 * Feature 4: organizer-submitted events start as status='pending'.
 * They only appear publicly after an admin approves them.
 */
const createEvent = async (req, res, next) => {
  try {
    const {
      title, description, location, event_date,
      price, total_tickets, category, images,
    } = req.body;

    if (!title || !event_date || !total_tickets) {
      return res.status(400).json({ error: "Title, event date and total tickets are required." });
    }
    if (total_tickets <= 0) {
      return res.status(400).json({ error: "Total tickets must be greater than zero." });
    }

    const today        = new Date(); today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(event_date); selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return res.status(400).json({ error: "Event date must be today or a future date." });
    }

    const event = await eventService.createEvent({
      title,
      description,
      location,
      event_date,
      price,
      total_tickets,
      available_tickets: total_tickets,
      category:          category || "Other",
      images:            Array.isArray(images) && images.length > 0 ? images : null,
      organizer_id:      req.user.id,
      status:            "pending",    // Feature 4: requires admin approval before going live
      is_featured:       false,
    });

    logger.info("Organizer submitted event for moderation", { organizerId: req.user.id, eventId: event.id });
    res.status(201).json({
      ...event.toJSON(),
      _notice: "Your event has been submitted and is pending admin approval before it goes live.",
    });
  } catch (err) {
    logger.error("Organizer event creation failed", { organizerId: req.user?.id, error: err.message });
    next(err);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const {
      title, description, location, event_date,
      price, total_tickets, category, images,
    } = req.body;

    const updatedEvent = await eventService.updateEvent(
      req.params.id,
      { title, description, location, event_date, price, total_tickets, category, images },
      req.user.id   // scoped to this organizer
    );

    if (!updatedEvent) {
      return res.status(404).json({ error: "Event not found or you do not own this event." });
    }

    logger.info("Organizer updated event", { organizerId: req.user.id, eventId: req.params.id });
    res.json(updatedEvent);
  } catch (err) {
    logger.error("Organizer event update failed", { organizerId: req.user?.id, error: err.message });
    next(err);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const deleted = await eventService.deleteEvent(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: "Event not found or you do not own this event." });
    logger.info("Organizer deleted event", { organizerId: req.user.id, eventId: req.params.id });
    res.json({ message: "Event deleted successfully." });
  } catch (err) {
    logger.error("Organizer event deletion failed", { organizerId: req.user?.id, error: err.message });
    next(err);
  }
};

const getRevenue = async (req, res, next) => {
  try {
    const revenue = await organizerService.getOrganizerRevenue(req.user.id);
    res.json(revenue);
  } catch (err) {
    logger.error("Failed to fetch organizer revenue", { organizerId: req.user?.id, error: err.message });
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await organizerService.getOrganizerStats(req.user.id);
    res.json(stats);
  } catch (err) {
    logger.error("Failed to fetch organizer stats", { organizerId: req.user?.id, error: err.message });
    next(err);
  }
};

const getEventAttendees = async (req, res, next) => {
  try {
    const result = await organizerService.getEventAttendees(req.params.id, req.user.id);
    if (!result) return res.status(404).json({ error: "Event not found or you do not own this event." });
    res.json(result);
  } catch (err) {
    logger.error("Attendee fetch failed", { organizerId: req.user?.id, eventId: req.params?.id, error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// ADMIN — ORGANIZER APPLICATION MANAGEMENT
// ─────────────────────────────────────────────────────────────

const listOrganizers = async (req, res, next) => {
  try {
    const { status } = req.query;
    const organizers = await organizerService.getAllOrganizers(status);
    logger.info("Admin fetched organizer list", { adminId: req.user?.id, status: status || "all", count: organizers.length });
    res.json(organizers);
  } catch (err) {
    logger.error("Admin organizer list fetch failed", { adminId: req.user?.id, error: err.message });
    next(err);
  }
};

const approveOrganizer = async (req, res, next) => {
  try {
    const profile = await organizerService.approveOrganizer(req.params.id);
    if (!profile) return res.status(404).json({ error: "Organizer profile not found." });
    logger.info("Organizer approved", { adminId: req.user?.id, profileId: req.params.id });
    res.json({ message: "Organizer approved successfully.", profile });
  } catch (err) {
    logger.error("Organizer approval failed", { adminId: req.user?.id, error: err.message });
    next(err);
  }
};

const rejectOrganizer = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const profile = await organizerService.rejectOrganizer(req.params.id, reason);
    if (!profile) return res.status(404).json({ error: "Organizer profile not found." });
    logger.info("Organizer rejected", { adminId: req.user?.id, profileId: req.params.id, reason });
    res.json({ message: "Organizer rejected.", profile });
  } catch (err) {
    logger.error("Organizer rejection failed", { adminId: req.user?.id, error: err.message });
    next(err);
  }
};

const deleteOrganizer = async (req, res, next) => {
  try {
    const result = await organizerService.deleteOrganizer(req.params.id);
    if (!result) return res.status(404).json({ error: "Organizer profile not found." });
    logger.info("Organizer deleted", { adminId: req.user?.id, profileId: req.params.id });
    res.json({ message: "Organizer account deleted successfully." });
  } catch (err) {
    logger.error("Organizer deletion failed", { adminId: req.user?.id, error: err.message });
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getMyEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getRevenue,
  getStats,
  getEventAttendees,
  listOrganizers,
  approveOrganizer,
  rejectOrganizer,
  deleteOrganizer,
};
