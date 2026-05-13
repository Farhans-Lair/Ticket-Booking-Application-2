const express      = require("express");
const router       = express.Router();
const path         = require("path");
const authenticate   = require("../middleware/auth.middleware");
const authorizeAdmin = require("../middleware/authorizeadmin");
const adminCtrl    = require("../controllers/admin.controllers");

// ── HTML Pages ────────────────────────────────────────────────────────────────
router.get("/",           (req, res) => res.sendFile(path.join(__dirname, "../../../frontend/admin-dashboard.html")));
router.get("/revenue",    (req, res) => res.sendFile(path.join(__dirname, "../../../frontend/admin-revenue.html")));
router.get("/organizers", (req, res) => res.sendFile(path.join(__dirname, "../../../frontend/admin-organizers.html")));
router.get("/moderation", (req, res) => res.sendFile(path.join(__dirname, "../../../frontend/admin-moderation.html")));
router.get("/payouts",    (req, res) => res.sendFile(path.join(__dirname, "../../../frontend/admin-payouts.html")));

// ── FIX Issue 2 & 3: Event Moderation API ────────────────────────────────────
// These are mounted under /admin router, so paths are relative (no /api/admin prefix)
router.get("/moderation/events",           authenticate, authorizeAdmin, adminCtrl.getAllEventsForAdmin);
router.get("/moderation/events/pending",   authenticate, authorizeAdmin, adminCtrl.getPendingEvents);
router.put("/moderation/events/:id/approve", authenticate, authorizeAdmin, adminCtrl.approveEvent);
router.put("/moderation/events/:id/reject",  authenticate, authorizeAdmin, adminCtrl.rejectEvent);

// ── Feature 2: Toggle featured ────────────────────────────────────────────────
router.put("/events/:id/feature", authenticate, authorizeAdmin, adminCtrl.toggleFeatured);

// ── FIX Issue 5: Payout API ───────────────────────────────────────────────────
router.get( "/payouts/data",                  authenticate, authorizeAdmin, adminCtrl.listPayouts);
router.get( "/payouts/settlement/:organizerId", authenticate, authorizeAdmin, adminCtrl.getSettlement);
router.post("/payouts/create",                authenticate, authorizeAdmin, adminCtrl.createPayout);
router.put( "/payouts/:id/status",            authenticate, authorizeAdmin, adminCtrl.updatePayoutStatus);

module.exports = router;
