const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const authorizeAdmin = require("../middleware/authorizeadmin");
const eventController = require("../controllers/event.controllers");

// Protected
router.get("/", authenticate, eventController.getEvents);

// Protected
router.post("/", authenticate, authorizeAdmin, eventController.createEvent);

module.exports = router;
