const express       = require("express");
const router        = express.Router();
const authenticate  = require("../middleware/auth.middleware");
const waitlistCtrl  = require("../controllers/waitlist.controllers");

router.post("/:eventId",   authenticate, waitlistCtrl.join);

router.delete("/:eventId", authenticate, waitlistCtrl.leave);

router.get("/",            authenticate, waitlistCtrl.getMyWaitlist);

router.get("/:eventId/stats", waitlistCtrl.getStats);

module.exports = router;
