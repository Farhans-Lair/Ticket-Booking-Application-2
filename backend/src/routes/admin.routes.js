const express      = require("express");
const router       = express.Router();
const path         = require("path");
const authenticate   = require("../middleware/auth.middleware");
const authorizeAdmin = require("../middleware/authorizeadmin");
const adminCtrl    = require("../controllers/admin.controllers");

// ── Super-admin HTML page routes ─────────────────────────────

router.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "../../../frontend/admin-dashboard.html"))
);
router.get("/revenue", (req, res) =>
  res.sendFile(path.join(__dirname, "../../../frontend/admin-revenue.html"))
);
router.get("/organizers", (req, res) =>
  res.sendFile(path.join(__dirname, "../../../frontend/admin-organizers.html"))
);

// Feature 4: Moderation page
router.get("/moderation", (req, res) =>
  res.sendFile(path.join(__dirname, "../../../frontend/admin-moderation.html"))
);

// Feature 5: Payouts page
router.get("/payouts", (req, res) =>
  res.sendFile(path.join(__dirname, "../../../frontend/admin-payouts.html"))
);

// ── API routes (all require admin auth) ──────────────────────

// Feature 4 — Event Moderation
router.get(   "/api/admin/moderation/events",         authenticate, authorizeAdmin, adminCtrl.getPendingEvents);
router.get(   "/api/admin/moderation/events/all",     authenticate, authorizeAdmin, adminCtrl.getAllEventsForAdmin);
router.put(   "/api/admin/moderation/events/:id/approve", authenticate, authorizeAdmin, adminCtrl.approveEvent);
router.put(   "/api/admin/moderation/events/:id/reject",  authenticate, authorizeAdmin, adminCtrl.rejectEvent);

// Feature 2 — Toggle featured
router.put(   "/api/admin/events/:id/feature",        authenticate, authorizeAdmin, adminCtrl.toggleFeatured);

// Feature 5 — Payouts
router.get(   "/api/admin/payouts",                   authenticate, authorizeAdmin, adminCtrl.listPayouts);
router.get(   "/api/admin/payouts/settlement/:organizerId", authenticate, authorizeAdmin, adminCtrl.getSettlement);
router.post(  "/api/admin/payouts",                   authenticate, authorizeAdmin, adminCtrl.createPayout);
router.put(   "/api/admin/payouts/:id/status",        authenticate, authorizeAdmin, adminCtrl.updatePayoutStatus);

module.exports = router;
