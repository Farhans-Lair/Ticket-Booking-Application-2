const express = require("express");
const router = express.Router();


const authenticate = require("../middleware/auth.middleware");
const authorizeAdmin = require("../middleware/authorizeadmin");
const eventController = require("../controllers/event.controllers");

// Get all events (protected)
router.get(
  "/",
  authenticate,
  (req, res, next) => eventController.getEvents(req, res, next)
);

// Create event (admin only)
router.post(
  "/",
  authenticate,
  authorizeAdmin,
  (req, res, next) => eventController.createEvent(req, res, next)
);

router.put(
  "/:id",
  authenticate,
  authorizeAdmin,
  (req,res,next)=>eventController.updateEvent(req,res,next)
);


// Delete event (admin only)
router.delete(
  "/:id",
  authenticate,
  authorizeAdmin,
  (req, res, next) => eventController.deleteEvent(req, res, next)
);


module.exports = router;
