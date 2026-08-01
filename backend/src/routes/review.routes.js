const express      = require("express");
const router       = express.Router();
const authenticate = require("../middleware/auth.middleware");
const reviewCtrl   = require("../controllers/review.controllers");

router.post("/events/:eventId",          authenticate, reviewCtrl.submitReview);

router.get("/events/:eventId",           reviewCtrl.getEventReviews);

router.get("/events/:eventId/summary",   reviewCtrl.getRatingSummary);

module.exports = router;
