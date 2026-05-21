/**
 * review.services.js — Feature 5: Reviews & ratings
 */
const { Review, Booking, Event } = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const logger = require("../config/logger");

/**
 * Submit a review.  User must have a paid, active booking to review.
 */
const submitReview = async (userId, eventId, rating, reviewText) => {
  if (rating < 1 || rating > 5)
    throw new Error("Rating must be between 1 and 5.");

  const existing = await Review.findOne({ where: { user_id: userId, event_id: eventId } });
  if (existing) throw new Error("You have already reviewed this event.");

  // Enforce verified booking
  const booking = await Booking.findOne({
    where: { user_id: userId, event_id: eventId, payment_status: "paid", cancellation_status: "active" },
  });
  if (!booking) throw new Error("You must have a paid booking for this event to leave a review.");

  const review = await Review.create({
    user_id:          userId,
    event_id:         eventId,
    rating,
    review_text:      reviewText || null,
    verified_booking: true,
  });

  await _updateEventRating(eventId);
  logger.info("Review submitted", { userId, eventId, rating });
  return review;
};

const getReviewsByEvent = (eventId) =>
  Review.findAll({ where: { event_id: eventId }, order: [["created_at", "DESC"]] });

const getRatingSummary = async (eventId) => {
  const result = await Review.findOne({
    where: { event_id: eventId, verified_booking: true },
    attributes: [
      [sequelize.fn("AVG", sequelize.col("rating")), "average"],
      [sequelize.fn("COUNT", sequelize.col("id")),   "count"],
    ],
    raw: true,
  });
  return {
    average_rating: result.average ? Math.round(parseFloat(result.average) * 10) / 10 : 0,
    review_count:   parseInt(result.count, 10) || 0,
  };
};

/* ─── Private: update cached avg on Event row ────────────────────────────── */
const _updateEventRating = async (eventId) => {
  const { average_rating, review_count } = await getRatingSummary(eventId);
  await Event.update({ average_rating, review_count }, { where: { id: eventId } });
};

module.exports = { submitReview, getReviewsByEvent, getRatingSummary };
