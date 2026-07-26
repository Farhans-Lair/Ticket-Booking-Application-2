const express            = require("express");
const router             = express.Router();
const authenticate       = require("../middleware/auth.middleware");
const authorizeOrganizer = require("../middleware/authorizeOrganizer");
const authorizeAdmin     = require("../middleware/authorizeadmin");
const organizerController = require("../controllers/organizer.controllers");
const adminCtrl          = require("../controllers/admin.controllers");

router.get("/profile",  authenticate, authorizeOrganizer, organizerController.getProfile);
router.put("/profile",  authenticate, authorizeOrganizer, organizerController.updateProfile);

router.get("/stats",    authenticate, authorizeOrganizer, organizerController.getStats);

router.get(    "/events",      authenticate, authorizeOrganizer, organizerController.getMyEvents);
router.post(   "/events",      authenticate, authorizeOrganizer, organizerController.createEvent);
router.put(    "/events/:id",  authenticate, authorizeOrganizer, organizerController.updateEvent);
router.delete( "/events/:id",  authenticate, authorizeOrganizer, organizerController.deleteEvent);
router.get(    "/events/:id/attendees", authenticate, authorizeOrganizer, organizerController.getEventAttendees);

router.get("/revenue",  authenticate, authorizeOrganizer, organizerController.getRevenue);

router.get("/payouts",          authenticate, authorizeOrganizer, adminCtrl.getOrganizerPayouts);

router.post("/payouts/request", authenticate, authorizeOrganizer, adminCtrl.requestPayout);

router.get(    "/admin/organizers",             authenticate, authorizeAdmin, organizerController.listOrganizers);
router.put(    "/admin/organizers/:id/approve", authenticate, authorizeAdmin, organizerController.approveOrganizer);
router.put(    "/admin/organizers/:id/reject",  authenticate, authorizeAdmin, organizerController.rejectOrganizer);
router.delete( "/admin/organizers/:id",         authenticate, authorizeAdmin, organizerController.deleteOrganizer);

module.exports = router;
