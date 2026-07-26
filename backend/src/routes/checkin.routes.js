const express      = require("express");
const router       = express.Router();
const authenticate = require("../middleware/auth.middleware");
const checkinCtrl  = require("../controllers/checkin.controllers");

router.post("/", authenticate, checkinCtrl.checkIn);

module.exports = router;
