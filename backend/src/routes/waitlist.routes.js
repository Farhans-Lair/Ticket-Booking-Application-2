/**
 * waitlist.routes.js — Feature 7: Waitlist for sold-out events
 */
const express       = require("express");
const router        = express.Router();
const authenticate  = require("../middleware/auth.middleware");
const waitlistCtrl  = require("../controllers/waitlist.controllers");

// POST   /waitlist/:eventId         → join   (auth required)
router.post("/:eventId",   authenticate, waitlistCtrl.join);

// DELETE /waitlist/:eventId         → leave  (auth required)
router.delete("/:eventId", authenticate, waitlistCtrl.leave);

// GET    /waitlist                  → my entries (auth required)
router.get("/",            authenticate, waitlistCtrl.getMyWaitlist);

// GET    /waitlist/:eventId/stats   → queue depth (public)
router.get("/:eventId/stats", waitlistCtrl.getStats);

module.exports = router;
