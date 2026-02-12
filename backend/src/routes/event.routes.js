const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorizeAdmin = require("../middleware/authorizeadmin");
const eventController = require("../controllers/event.controllers");

app.get(
  "/admin",
  authenticate,
  authorizeAdmin,
  (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/admin-events.html"));
  }
);

// Protected: any logged-in user
router.get("/", authenticate, eventController.getEvents);

// Protected: admin only
router.post("/", authenticate, authorizeAdmin, eventController.createEvent);

//Delete event 
router.delete( "/:id", authenticate, authorizeAdmin, eventController.deleteEvent );


module.exports = router;
