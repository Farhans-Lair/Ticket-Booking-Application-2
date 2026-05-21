/**
 * wishlist.controllers.js — Feature 6: Wishlist / save event
 *
 * POST   /wishlist/:eventId   → save event (body: { "notify": true })
 * DELETE /wishlist/:eventId   → remove from wishlist
 * GET    /wishlist            → user's saved events
 */
const wishlistService = require("../services/wishlist.services");
const logger          = require("../config/logger");

const saveEvent = async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const notify  = !!(req.body && req.body.notify);
    const entry   = await wishlistService.save(req.user.id, eventId, notify);
    logger.info("Wishlist saved", { userId: req.user.id, eventId });
    res.status(201).json(entry);
  } catch (err) {
    err.statusCode = 400;
    next(err);
  }
};

const removeEvent = async (req, res, next) => {
  try {
    await wishlistService.remove(req.user.id, parseInt(req.params.eventId, 10));
    res.json({ message: "Removed from wishlist." });
  } catch (err) { next(err); }
};

const getMyWishlist = async (req, res, next) => {
  try {
    res.json(await wishlistService.getForUser(req.user.id));
  } catch (err) { next(err); }
};

module.exports = { saveEvent, removeEvent, getMyWishlist };
