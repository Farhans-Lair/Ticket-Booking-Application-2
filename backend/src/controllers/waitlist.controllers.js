/**
 * waitlist.controllers.js — Feature 7: Waitlist for sold-out events
 *
 * POST   /waitlist/:eventId              → join waitlist
 * DELETE /waitlist/:eventId              → leave waitlist
 * GET    /waitlist                       → user's waitlist entries
 * GET    /waitlist/:eventId/stats        → queue depth (public)
 */
const waitlistService = require("../services/waitlist.services");
const logger          = require("../config/logger");

const join = async (req, res, next) => {
  try {
    const eventId      = parseInt(req.params.eventId, 10);
    const ticketsWanted = parseInt((req.body && req.body.tickets_wanted) || 1, 10);
    const entry = await waitlistService.join(req.user.id, eventId, ticketsWanted);
    logger.info("Waitlist joined", { userId: req.user.id, eventId });
    res.status(201).json(entry);
  } catch (err) {
    err.statusCode = 400;
    next(err);
  }
};

const leave = async (req, res, next) => {
  try {
    await waitlistService.leave(req.user.id, parseInt(req.params.eventId, 10));
    res.json({ message: "Removed from waitlist." });
  } catch (err) { next(err); }
};

const getMyWaitlist = async (req, res, next) => {
  try {
    res.json(await waitlistService.getForUser(req.user.id));
  } catch (err) { next(err); }
};

const getStats = async (req, res, next) => {
  try {
    res.json(await waitlistService.getQueueStats(parseInt(req.params.eventId, 10)));
  } catch (err) { next(err); }
};

module.exports = { join, leave, getMyWaitlist, getStats };
