const organizerService = require("../services/organizer.services");
const eventService     = require("../services/event.services");
const logger           = require("../config/logger");

// ─────────────────────────────────────────────────────────────
// ORGANIZER — PROFILE
// ─────────────────────────────────────────────────────────────

/**
 * GET /organizer/profile
 * Returns the logged-in organizer's business profile.
 */
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

/**
 * PUT /organizer/profile
 * Organizer updates their own business details.
 */
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

/**
 * GET /organizer/events
 * Lists only events belonging to this organizer.
 */
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
 * Creates an event owned by this organizer.
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
      category:   category || "Other",
      images:     Array.isArray(images) && images.length > 0 ? images : null,
      organizer_id: req.user.id,   // ← scoped to this organizer
    });

    logger.info("Organizer created event", { organizerId: req.user.id, eventId: event.id });
    res.status(201).json(event);
  } catch (err) {
    logger.error("Organizer event creation failed", { organizerId: req.user?.id, error: err.message });
    next(err);
  }
};

/**
 * PUT /organizer/events/:id
 * Updates an event — ownership is enforced inside the service.
 */
const updateEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const updated = await eventService.updateEvent(eventId, req.body, req.user.id);

    if (!updated) {
      return res.status(404).json({ error: "Event not found or you do not own this event." });
    }

    logger.info("Organizer updated event", { organizerId: req.user.id, eventId });
    res.json(updated);
  } catch (err) {
    logger.error("Organizer event update failed", { organizerId: req.user?.id, eventId: req.params?.id, error: err.message });
    next(err);
  }
};

/**
 * DELETE /organizer/events/:id
 * Deletes an event — ownership is enforced inside the service.
 */
const deleteEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const deleted = await eventService.deleteEvent(eventId, req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: "Event not found or you do not own this event." });
    }

    logger.info("Organizer deleted event", { organizerId: req.user.id, eventId });
    res.json({ message: "Event deleted successfully." });
  } catch (err) {
    logger.error("Organizer event deletion failed", { organizerId: req.user?.id, eventId: req.params?.id, error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// ORGANIZER — REVENUE & STATS
// ─────────────────────────────────────────────────────────────

/**
 * GET /organizer/revenue
 * Revenue breakdown across all organizer's events.
 */
const getRevenue = async (req, res, next) => {
  try {
    const events = await organizerService.getOrganizerRevenue(req.user.id);
    logger.info("Organizer revenue fetched", { organizerId: req.user.id, eventCount: events.length });
    res.json(events);
  } catch (err) {
    logger.error("Organizer revenue fetch failed", { organizerId: req.user?.id, error: err.message });
    next(err);
  }
};

/**
 * GET /organizer/stats
 * Summary stats for the organizer dashboard overview cards.
 */
const getStats = async (req, res, next) => {
  try {
    const stats = await organizerService.getOrganizerStats(req.user.id);
    res.json(stats);
  } catch (err) {
    logger.error("Organizer stats fetch failed", { organizerId: req.user?.id, error: err.message });
    next(err);
  }
};

/**
 * GET /organizer/events/:id/attendees
 * Attendee (ticket-buyer) list for one of the organizer's events.
 */
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

/**
 * GET /api/admin/organizers?status=pending
 * Lists all organizer applications, optionally filtered by status.
 */
const listOrganizers = async (req, res, next) => {
  try {
    const { status } = req.query; // pending | approved | rejected | undefined (all)
    const organizers = await organizerService.getAllOrganizers(status);
    logger.info("Admin fetched organizer list", { adminId: req.user?.id, status: status || "all", count: organizers.length });
    res.json(organizers);
  } catch (err) {
    logger.error("Admin organizer list fetch failed", { adminId: req.user?.id, error: err.message });
    next(err);
  }
};

/**
 * PUT /api/admin/organizers/:id/approve
 * Approves the organizer application with the given profile ID.
 */
const approveOrganizer = async (req, res, next) => {
  try {
    const profile = await organizerService.approveOrganizer(req.params.id);
    if (!profile) return res.status(404).json({ error: "Organizer profile not found." });
    logger.info("Organizer approved", { adminId: req.user?.id, profileId: req.params.id });
    res.json({ message: "Organizer approved successfully.", profile });
  } catch (err) {
    logger.error("Organizer approval failed", { adminId: req.user?.id, profileId: req.params?.id, error: err.message });
    next(err);
  }
};

/**
 * PUT /api/admin/organizers/:id/reject
 * Rejects the application with an optional reason in req.body.reason.
 */
const rejectOrganizer = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const profile = await organizerService.rejectOrganizer(req.params.id, reason);
    if (!profile) return res.status(404).json({ error: "Organizer profile not found." });
    logger.info("Organizer rejected", { adminId: req.user?.id, profileId: req.params.id, reason });
    res.json({ message: "Organizer rejected.", profile });
  } catch (err) {
    logger.error("Organizer rejection failed", { adminId: req.user?.id, profileId: req.params?.id, error: err.message });
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
};
