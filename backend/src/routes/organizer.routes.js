const express            = require("express");
const router             = express.Router();
const authenticate       = require("../middleware/auth.middleware");
const authorizeOrganizer = require("../middleware/authorizeOrganizer");
const authorizeAdmin     = require("../middleware/authorizeadmin");
const organizerController = require("../controllers/organizer.controllers");
const adminCtrl          = require("../controllers/admin.controllers");

// ─────────────────────────────────────────────────────────────
// ORGANIZER DASHBOARD ROUTES
// All routes require: authenticated + approved organizer (or admin)
// ─────────────────────────────────────────────────────────────

// Profile
router.get("/profile",  authenticate, authorizeOrganizer, organizerController.getProfile);
router.put("/profile",  authenticate, authorizeOrganizer, organizerController.updateProfile);

// Summary stats (dashboard overview cards)
router.get("/stats",    authenticate, authorizeOrganizer, organizerController.getStats);

// Events — organizer manages only their own events
// NOTE: organizer-created events now default to status='pending' (Feature 4)
router.get(    "/events",      authenticate, authorizeOrganizer, organizerController.getMyEvents);
router.post(   "/events",      authenticate, authorizeOrganizer, organizerController.createEvent);
router.put(    "/events/:id",  authenticate, authorizeOrganizer, organizerController.updateEvent);
router.delete( "/events/:id",  authenticate, authorizeOrganizer, organizerController.deleteEvent);

// Attendees per event
router.get("/events/:id/attendees", authenticate, authorizeOrganizer, organizerController.getEventAttendees);

// Revenue breakdown
router.get("/revenue",  authenticate, authorizeOrganizer, organizerController.getRevenue);

// Feature 5 — Organizer views their own payouts
router.get("/payouts",  authenticate, authorizeOrganizer, adminCtrl.getOrganizerPayouts);

// ─────────────────────────────────────────────────────────────
// ADMIN — ORGANIZER APPLICATION MANAGEMENT
// ─────────────────────────────────────────────────────────────
router.get(    "/admin/organizers",               authenticate, authorizeAdmin, organizerController.listOrganizers);
router.put(    "/admin/organizers/:id/approve",   authenticate, authorizeAdmin, organizerController.approveOrganizer);
router.put(    "/admin/organizers/:id/reject",    authenticate, authorizeAdmin, organizerController.rejectOrganizer);
router.delete( "/admin/organizers/:id",           authenticate, authorizeAdmin, organizerController.deleteOrganizer);

module.exports = router;
