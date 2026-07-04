const express        = require("express");
const router         = express.Router();
const authenticate   = require("../middleware/auth.middleware");
const authorizeAdmin = require("../middleware/authorizeadmin");
const eventController = require("../controllers/event.controllers");

// ── Public endpoints (no auth) ──────────────────────────────
// Feature 2: Featured and trending events for the homepage
router.get("/featured",  eventController.getFeaturedEvents);
router.get("/trending",  eventController.getTrendingEvents);

// ── Protected endpoints ─────────────────────────────────────
// Get all approved events (logged-in users)
router.get(
  "/",
  authenticate,
  eventController.getEvents
);

// Create event (admin only) — auto-approved
router.post(
  "/",
  authenticate,
  authorizeAdmin,
  eventController.createEvent
);

// Update event (admin only)
router.put(
  "/:id",
  authenticate,
  authorizeAdmin,
  eventController.updateEvent
);

// Delete event (admin only)
router.delete(
  "/:id",
  authenticate,
  authorizeAdmin,
  eventController.deleteEvent
);

module.exports = router;
