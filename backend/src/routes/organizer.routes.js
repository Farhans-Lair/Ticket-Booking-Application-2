const express            = require("express");
const router             = express.Router();
const authenticate       = require("../middleware/auth.middleware");
const authorizeOrganizer = require("../middleware/authorizeOrganizer");
const authorizeAdmin     = require("../middleware/authorizeadmin");
const organizerController = require("../controllers/organizer.controllers");
const adminCtrl          = require("../controllers/admin.controllers");

// ── Profile ───────────────────────────────────────────────────────────────────
router.get("/profile",  authenticate, authorizeOrganizer, organizerController.getProfile);
router.put("/profile",  authenticate, authorizeOrganizer, organizerController.updateProfile);

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get("/stats",    authenticate, authorizeOrganizer, organizerController.getStats);

// ── Events ────────────────────────────────────────────────────────────────────
// FIX Issue 2: organizer events start as status='pending' (in controller)
router.get(    "/events",      authenticate, authorizeOrganizer, organizerController.getMyEvents);
router.post(   "/events",      authenticate, authorizeOrganizer, organizerController.createEvent);
router.put(    "/events/:id",  authenticate, authorizeOrganizer, organizerController.updateEvent);
router.delete( "/events/:id",  authenticate, authorizeOrganizer, organizerController.deleteEvent);
router.get(    "/events/:id/attendees", authenticate, authorizeOrganizer, organizerController.getEventAttendees);

// ── Revenue ───────────────────────────────────────────────────────────────────
router.get("/revenue",  authenticate, authorizeOrganizer, organizerController.getRevenue);

// ── FIX Issue 1 & 5: Payouts ─────────────────────────────────────────────────
// GET  /organizer/payouts         → view payout history + summary
router.get("/payouts",          authenticate, authorizeOrganizer, adminCtrl.getOrganizerPayouts);
// POST /organizer/payouts/request → organizer requests payout from revenue dashboard
router.post("/payouts/request", authenticate, authorizeOrganizer, adminCtrl.requestPayout);

// ── Admin — organizer management ─────────────────────────────────────────────
router.get(    "/admin/organizers",             authenticate, authorizeAdmin, organizerController.listOrganizers);
router.put(    "/admin/organizers/:id/approve", authenticate, authorizeAdmin, organizerController.approveOrganizer);
router.put(    "/admin/organizers/:id/reject",  authenticate, authorizeAdmin, organizerController.rejectOrganizer);
router.delete( "/admin/organizers/:id",         authenticate, authorizeAdmin, organizerController.deleteOrganizer);

module.exports = router;
