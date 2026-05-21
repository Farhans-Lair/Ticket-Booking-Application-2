/**
 * review.routes.js — Feature 5: Reviews & ratings
 */
const express      = require("express");
const router       = express.Router();
const authenticate = require("../middleware/auth.middleware");
const reviewCtrl   = require("../controllers/review.controllers");

// POST /reviews/events/:eventId         → submit review (auth required)
router.post("/events/:eventId",          authenticate, reviewCtrl.submitReview);

// GET  /reviews/events/:eventId         → all reviews for event (public)
router.get("/events/:eventId",           reviewCtrl.getEventReviews);

// GET  /reviews/events/:eventId/summary → avg rating + count (public)
router.get("/events/:eventId/summary",   reviewCtrl.getRatingSummary);

module.exports = router;
