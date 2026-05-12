/**
 * admin.controllers.js
 *
 * Covers:
 *  Feature 4 — Event moderation (approve / reject)
 *  Feature 5 — Organizer payout management
 *  Feature 2 — Toggle featured flag on events
 */

const eventService  = require("../services/event.services");
const payoutService = require("../services/payout.services");
const logger        = require("../config/logger");
const { User, OrganizerProfile, Event, Booking } = require("../models");

// ─────────────────────────────────────────────────────────────
// FEATURE 4: EVENT MODERATION
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/moderation/events
 * Returns all events awaiting moderation (status = 'pending')
 */
const getPendingEvents = async (req, res, next) => {
  try {
    const events = await eventService.getPendingEvents();
    res.json(events);
  } catch (err) {
    logger.error("Failed to fetch pending events", { adminId: req.user?.id, error: err.message });
    next(err);
  }
};

/**
 * GET /api/admin/moderation/events/all
 * Returns ALL events with status info (admin moderation dashboard)
 */
const getAllEventsForAdmin = async (req, res, next) => {
  try {
    const events = await eventService.getAllEventsForAdmin();
    res.json(events);
  } catch (err) {
    logger.error("Failed to fetch admin event list", { adminId: req.user?.id, error: err.message });
    next(err);
  }
};

/**
 * PUT /api/admin/moderation/events/:id/approve
 * Approve a pending event, making it publicly visible.
 */
const approveEvent = async (req, res, next) => {
  try {
    const { note } = req.body;
    const event = await eventService.approveEvent(req.params.id, req.user.id, note);
    if (!event) return res.status(404).json({ error: "Event not found." });
    logger.info("Event approved", { adminId: req.user.id, eventId: req.params.id });
    res.json({ message: "Event approved successfully.", event });
  } catch (err) {
    logger.error("Event approval failed", { adminId: req.user?.id, eventId: req.params?.id, error: err.message });
    next(err);
  }
};

/**
 * PUT /api/admin/moderation/events/:id/reject
 * Reject an event with a reason.
 */
const rejectEvent = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ error: "A rejection reason (note) is required." });
    const event = await eventService.rejectEvent(req.params.id, req.user.id, note);
    if (!event) return res.status(404).json({ error: "Event not found." });
    logger.info("Event rejected", { adminId: req.user.id, eventId: req.params.id, note });
    res.json({ message: "Event rejected.", event });
  } catch (err) {
    logger.error("Event rejection failed", { adminId: req.user?.id, eventId: req.params?.id, error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// FEATURE 2: TOGGLE FEATURED FLAG
// ─────────────────────────────────────────────────────────────

/**
 * PUT /api/admin/events/:id/feature
 * Body: { is_featured: true | false }
 */
const toggleFeatured = async (req, res, next) => {
  try {
    const { is_featured } = req.body;
    if (typeof is_featured !== "boolean") {
      return res.status(400).json({ error: "is_featured must be a boolean." });
    }
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });

    await event.update({ is_featured });
    logger.info(`Event ${is_featured ? "featured" : "unfeatured"}`, { adminId: req.user.id, eventId: req.params.id });
    res.json({ message: `Event ${is_featured ? "marked as featured" : "removed from featured"}.`, event });
  } catch (err) {
    logger.error("Toggle featured failed", { adminId: req.user?.id, error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// FEATURE 5: PAYOUT MANAGEMENT
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/payouts
 * Query params: organizerId, status, page, limit
 */
const listPayouts = async (req, res, next) => {
  try {
    const { organizerId, status, page = 1, limit = 20 } = req.query;
    const result = await payoutService.getAllPayouts({
      organizerId: organizerId ? parseInt(organizerId) : undefined,
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json(result);
  } catch (err) {
    logger.error("Failed to list payouts", { adminId: req.user?.id, error: err.message });
    next(err);
  }
};

/**
 * GET /api/admin/payouts/settlement/:organizerId
 * Calculate outstanding settlement for an organizer.
 */
const getSettlement = async (req, res, next) => {
  try {
    const { eventId } = req.query;
    const data = await payoutService.calculateSettlement(
      parseInt(req.params.organizerId),
      eventId ? parseInt(eventId) : null
    );
    res.json(data);
  } catch (err) {
    logger.error("Settlement calculation failed", { adminId: req.user?.id, error: err.message });
    next(err);
  }
};

/**
 * POST /api/admin/payouts
 * Create a new payout record.
 * Body: { organizer_id, event_id?, amount, payment_method, reference_id?, notes? }
 */
const createPayout = async (req, res, next) => {
  try {
    const { organizer_id, event_id, amount, payment_method, reference_id, notes } = req.body;
    if (!organizer_id || !amount || !payment_method) {
      return res.status(400).json({ error: "organizer_id, amount, and payment_method are required." });
    }
    const payout = await payoutService.createPayout({
      organizer_id, event_id, amount, payment_method, reference_id, notes,
      adminId: req.user.id,
    });
    logger.info("Payout created", { adminId: req.user.id, payoutId: payout.id, organizer_id, amount });
    res.status(201).json(payout);
  } catch (err) {
    logger.error("Payout creation failed", { adminId: req.user?.id, error: err.message });
    next(err);
  }
};

/**
 * PUT /api/admin/payouts/:id/status
 * Update payout status.
 * Body: { status: 'processing'|'paid'|'failed', reference_id? }
 */
const updatePayoutStatus = async (req, res, next) => {
  try {
    const { status, reference_id } = req.body;
    const allowed = ["processing", "paid", "failed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
    }
    const payout = await payoutService.updatePayoutStatus(
      req.params.id, status, reference_id, req.user.id
    );
    if (!payout) return res.status(404).json({ error: "Payout not found." });
    logger.info("Payout status updated", { adminId: req.user.id, payoutId: req.params.id, status });
    res.json(payout);
  } catch (err) {
    logger.error("Payout status update failed", { adminId: req.user?.id, error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// ORGANIZER payout endpoints (called by organizer role)
// ─────────────────────────────────────────────────────────────

/**
 * GET /organizer/payouts
 * Organizer sees their own payout history.
 */
const getOrganizerPayouts = async (req, res, next) => {
  try {
    const payouts  = await payoutService.getOrganizerPayouts(req.user.id);
    const summary  = await payoutService.getOrganizerPayoutSummary(req.user.id);
    res.json({ summary, payouts });
  } catch (err) {
    logger.error("Failed to fetch organizer payouts", { userId: req.user?.id, error: err.message });
    next(err);
  }
};

module.exports = {
  getPendingEvents,
  getAllEventsForAdmin,
  approveEvent,
  rejectEvent,
  toggleFeatured,
  listPayouts,
  getSettlement,
  createPayout,
  updatePayoutStatus,
  getOrganizerPayouts,
};
