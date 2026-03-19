const express            = require("express");
const router             = express.Router();
const authenticate       = require("../middleware/auth.middleware");
const authorizeOrganizer = require("../middleware/authorizeOrganizer");
const authorizeAdmin     = require("../middleware/authorizeadmin");
const organizerController = require("../controllers/organizer.controllers");

// ─────────────────────────────────────────────────────────────
// ORGANIZER DASHBOARD ROUTES
// All routes require: authenticated + approved organizer (or admin)
// ─────────────────────────────────────────────────────────────

// Profile
router.get(
  "/profile",
  authenticate, authorizeOrganizer,
  organizerController.getProfile
);

router.put(
  "/profile",
  authenticate, authorizeOrganizer,
  organizerController.updateProfile
);

// Summary stats (dashboard overview cards)
router.get(
  "/stats",
  authenticate, authorizeOrganizer,
  organizerController.getStats
);

// Events — organizer manages only their own events
router.get(
  "/events",
  authenticate, authorizeOrganizer,
  organizerController.getMyEvents
);

router.post(
  "/events",
  authenticate, authorizeOrganizer,
  organizerController.createEvent
);

router.put(
  "/events/:id",
  authenticate, authorizeOrganizer,
  organizerController.updateEvent
);

router.delete(
  "/events/:id",
  authenticate, authorizeOrganizer,
  organizerController.deleteEvent
);

// Attendees per event
router.get(
  "/events/:id/attendees",
  authenticate, authorizeOrganizer,
  organizerController.getEventAttendees
);

// Revenue breakdown
router.get(
  "/revenue",
  authenticate, authorizeOrganizer,
  organizerController.getRevenue
);

// ─────────────────────────────────────────────────────────────
// ADMIN — ORGANIZER APPLICATION MANAGEMENT
// Mounted at /organizer/admin/... (admin only)
// ─────────────────────────────────────────────────────────────

// List all applications  GET /organizer/admin/organizers?status=pending
router.get(
  "/admin/organizers",
  authenticate, authorizeAdmin,
  organizerController.listOrganizers
);

// Approve application    PUT /organizer/admin/organizers/:id/approve
router.put(
  "/admin/organizers/:id/approve",
  authenticate, authorizeAdmin,
  organizerController.approveOrganizer
);

// Reject application     PUT /organizer/admin/organizers/:id/reject
router.put(
  "/admin/organizers/:id/reject",
  authenticate, authorizeAdmin,
  organizerController.rejectOrganizer
);

module.exports = router;
