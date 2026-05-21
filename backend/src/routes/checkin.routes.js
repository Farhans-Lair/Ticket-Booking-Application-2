/**
 * checkin.routes.js — Feature 3: QR check-in
 */
const express      = require("express");
const router       = express.Router();
const authenticate = require("../middleware/auth.middleware");
const checkinCtrl  = require("../controllers/checkin.controllers");

// POST /checkin   → organizer scans QR token to mark booking checked-in
router.post("/", authenticate, checkinCtrl.checkIn);

module.exports = router;
