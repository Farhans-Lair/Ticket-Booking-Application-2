const express = require("express");
const router = express.Router();
const eventController = require("../controllers/event.controllers");
const authenticate = require("../middleware/auth.middleware");

// Public
router.get("/", eventController.getEvents);

// Protected
router.post("/", authenticate, eventController.createEvent);

module.exports = router;
