const express        = require("express");
const router         = express.Router();
const authenticate   = require("../middleware/auth.middleware");
const authorizeAdmin = require("../middleware/authorizeadmin");
const eventController = require("../controllers/event.controllers");

router.get("/featured",  eventController.getFeaturedEvents);
router.get("/trending",  eventController.getTrendingEvents);

router.get(
  "/",
  authenticate,
  eventController.getEvents
);

router.post(
  "/",
  authenticate,
  authorizeAdmin,
  eventController.createEvent
);

router.put(
  "/:id",
  authenticate,
  authorizeAdmin,
  eventController.updateEvent
);

router.delete(
  "/:id",
  authenticate,
  authorizeAdmin,
  eventController.deleteEvent
);

module.exports = router;
