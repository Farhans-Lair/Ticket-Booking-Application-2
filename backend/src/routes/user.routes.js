const express     = require("express");
const router      = express.Router();
const authenticate = require("../middleware/auth.middleware");
const userCtrl    = require("../controllers/user.controllers");

// All routes require authentication
router.use(authenticate);

// GET  /user/profile          → fetch own profile + booking summary
router.get("/profile",           userCtrl.getProfile);

// PUT  /user/profile          → update name, phone, bio, avatar_url
router.put("/profile",           userCtrl.updateProfile);

// PUT  /user/profile/password → change password
router.put("/profile/password",  userCtrl.changePassword);

// GET  /user/profile/bookings → full booking history
router.get("/profile/bookings",  userCtrl.getBookingHistory);

module.exports = router;
