/**
 * review.controllers.js — Feature 5: Reviews & ratings
 *
 * POST /reviews/events/:eventId         → submit review (auth required)
 * GET  /reviews/events/:eventId         → all reviews for an event (public)
 * GET  /reviews/events/:eventId/summary → avg rating + count (public)
 */
const reviewService = require("../services/review.services");
const logger        = require("../config/logger");

const submitReview = async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    const { rating, text } = req.body || {};
    const review = await reviewService.submitReview(req.user.id, eventId, parseInt(rating, 10), text);
    logger.info("Review submitted", { userId: req.user.id, eventId });
    res.status(201).json(review);
  } catch (err) {
    err.statusCode = 400;
    next(err);
  }
};

const getEventReviews = async (req, res, next) => {
  try {
    res.json(await reviewService.getReviewsByEvent(parseInt(req.params.eventId, 10)));
  } catch (err) { next(err); }
};

const getRatingSummary = async (req, res, next) => {
  try {
    res.json(await reviewService.getRatingSummary(parseInt(req.params.eventId, 10)));
  } catch (err) { next(err); }
};

module.exports = { submitReview, getEventReviews, getRatingSummary };
