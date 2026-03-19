const express = require("express");
const router  = express.Router();
const path    = require("path");

// ── Super-admin HTML pages ────────────────────────────────────

// Main dashboard
router.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "../../../frontend/admin-dashboard.html"))
);

// Platform-wide revenue
router.get("/revenue", (req, res) =>
  res.sendFile(path.join(__dirname, "../../../frontend/admin-revenue.html"))
);

// Organizer application management (NEW)
// Admin reviews pending organizer registrations here
router.get("/organizers", (req, res) =>
  res.sendFile(path.join(__dirname, "../../../frontend/admin-organizers.html"))
);

module.exports = router;
