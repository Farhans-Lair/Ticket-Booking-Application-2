/**
 * admin.controllers.js
 * FIX Issues 2, 3, 5:
 *  - Event moderation endpoints work correctly
 *  - Featured toggle included
 *  - Admin payout approval (approve organizer payout requests)
 *  - Organizer payout request viewed by admin
 */

const eventService  = require("../services/event.services");
const payoutService = require("../services/payout.services");
const logger        = require("../config/logger");
const { User, OrganizerProfile, Event, Booking } = require("../models");

// ── Feature 4: Event Moderation ──────────────────────────────────────────────

const getPendingEvents = async (req, res, next) => {
  try {
    const events = await eventService.getPendingEvents();
    res.json(events);
  } catch (err) { logger.error("getPendingEvents failed", { error: err.message }); next(err); }
};

const getAllEventsForAdmin = async (req, res, next) => {
  try {
    const events = await eventService.getAllEventsForAdmin();
    res.json(events);
  } catch (err) { logger.error("getAllEventsForAdmin failed", { error: err.message }); next(err); }
};

const approveEvent = async (req, res, next) => {
  try {
    const { note } = req.body;
    const event = await eventService.approveEvent(req.params.id, req.user.id, note);
    if (!event) return res.status(404).json({ error: "Event not found." });
    logger.info("Event approved", { adminId: req.user.id, eventId: req.params.id });
    res.json({ message: "Event approved successfully.", event });
  } catch (err) { logger.error("approveEvent failed", { error: err.message }); next(err); }
};

const rejectEvent = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ error: "A rejection reason (note) is required." });
    const event = await eventService.rejectEvent(req.params.id, req.user.id, note);
    if (!event) return res.status(404).json({ error: "Event not found." });
    logger.info("Event rejected", { adminId: req.user.id, eventId: req.params.id });
    res.json({ message: "Event rejected.", event });
  } catch (err) { logger.error("rejectEvent failed", { error: err.message }); next(err); }
};

// ── Feature 2: Toggle Featured ───────────────────────────────────────────────

const toggleFeatured = async (req, res, next) => {
  try {
    const { is_featured } = req.body;
    if (typeof is_featured !== "boolean")
      return res.status(400).json({ error: "is_featured must be a boolean." });
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });
    await event.update({ is_featured });
    logger.info(`Event ${is_featured ? "featured" : "unfeatured"}`, { adminId: req.user.id, eventId: req.params.id });
    res.json({ message: `Event ${is_featured ? "marked as featured" : "removed from featured"}.`, event });
  } catch (err) { logger.error("toggleFeatured failed", { error: err.message }); next(err); }
};

// ── Feature 5: Payout Management ─────────────────────────────────────────────

// GET /api/admin/payouts — list all payouts, including organizer requests
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
  } catch (err) { logger.error("listPayouts failed", { error: err.message }); next(err); }
};

// GET /api/admin/payouts/settlement/:organizerId
const getSettlement = async (req, res, next) => {
  try {
    const { eventId } = req.query;
    const data = await payoutService.calculateSettlement(
      parseInt(req.params.organizerId),
      eventId ? parseInt(eventId) : null
    );
    res.json(data);
  } catch (err) { logger.error("getSettlement failed", { error: err.message }); next(err); }
};

// POST /api/admin/payouts — admin manually creates payout
const createPayout = async (req, res, next) => {
  try {
    const { organizer_id, event_id, amount, payment_method, reference_id, notes } = req.body;
    if (!organizer_id || !amount || !payment_method)
      return res.status(400).json({ error: "organizer_id, amount and payment_method are required." });
    const payout = await payoutService.createPayout({
      organizer_id, event_id, amount, payment_method, reference_id, notes, adminId: req.user.id,
    });
    logger.info("Payout created", { adminId: req.user.id, payoutId: payout.id });
    res.status(201).json(payout);
  } catch (err) { logger.error("createPayout failed", { error: err.message }); next(err); }
};

// PUT /api/admin/payouts/:id/status — update status (approve = 'processing' or 'paid')
const updatePayoutStatus = async (req, res, next) => {
  try {
    const { status, reference_id, rejection_reason } = req.body;
    const allowed = ["processing", "paid", "failed"];
    if (!allowed.includes(status))
      return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
    if (status === "failed" && !rejection_reason)
      return res.status(400).json({ error: "A rejection reason is required when rejecting a payout." });
    const payout = await payoutService.updatePayoutStatus(req.params.id, status, reference_id, req.user.id, rejection_reason);
    if (!payout) return res.status(404).json({ error: "Payout not found." });
    logger.info("Payout status updated", { adminId: req.user.id, payoutId: req.params.id, status });
    res.json(payout);
  } catch (err) { logger.error("updatePayoutStatus failed", { error: err.message }); next(err); }
};

// ── Organizer payout endpoints ────────────────────────────────────────────────

// GET /organizer/payouts — organizer sees own payout history
const getOrganizerPayouts = async (req, res, next) => {
  try {
    const payouts = await payoutService.getOrganizerPayouts(req.user.id);
    const summary = await payoutService.getOrganizerPayoutSummary(req.user.id);
    res.json({ summary, payouts });
  } catch (err) { logger.error("getOrganizerPayouts failed", { error: err.message }); next(err); }
};

// POST /organizer/payouts/request — FIX Issue 1: organizer requests payout
const requestPayout = async (req, res, next) => {
  try {
    const { event_id, payment_method, request_note } = req.body;
    const result = await payoutService.requestPayout({
      organizer_id:   req.user.id,
      event_id:       event_id ? parseInt(event_id) : null,
      payment_method: payment_method || "bank_transfer",
      request_note,
    });
    logger.info("Organizer payout requested", { organizerId: req.user.id, payoutId: result.payout.id });
    res.status(201).json(result);
  } catch (err) {
    logger.error("requestPayout failed", { error: err.message });
    err.statusCode = 400;
    next(err);
  }
};

module.exports = {
  getPendingEvents, getAllEventsForAdmin, approveEvent, rejectEvent, toggleFeatured,
  listPayouts, getSettlement, createPayout, updatePayoutStatus,
  getOrganizerPayouts, requestPayout,
};
