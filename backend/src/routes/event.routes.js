<<<<<<< HEAD
const express        = require("express");
const router         = express.Router();
const authenticate   = require("../middleware/auth.middleware");
const authorizeAdmin = require("../middleware/authorizeadmin");
const eventController = require("../controllers/event.controllers");

// ── Public endpoints (no auth) ──────────────────────────────
// Feature 2: Featured and trending events for the homepage
router.get("/featured",  eventController.getFeaturedEvents);
router.get("/trending",  eventController.getTrendingEvents);

// ── Protected endpoints ─────────────────────────────────────
// Get all approved events (logged-in users)
router.get(
  "/",
  authenticate,
  eventController.getEvents
);

// Create event (admin only) — auto-approved
=======
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
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
router.post(
  "/",
  authenticate,
  authorizeAdmin,
<<<<<<< HEAD
  eventController.createEvent
);

// Update event (admin only)
=======
  (req, res, next) => eventController.createEvent(req, res, next)
);

>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
router.put(
  "/:id",
  authenticate,
  authorizeAdmin,
<<<<<<< HEAD
  eventController.updateEvent
);

=======
  (req,res,next)=>eventController.updateEvent(req,res,next)
);


>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
// Delete event (admin only)
router.delete(
  "/:id",
  authenticate,
  authorizeAdmin,
<<<<<<< HEAD
  eventController.deleteEvent
);

=======
  (req, res, next) => eventController.deleteEvent(req, res, next)
);


>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
module.exports = router;
