const express     = require("express");
const router      = express.Router();
const authenticate = require("../middleware/auth.middleware");
const userCtrl    = require("../controllers/user.controllers");

router.use(authenticate);

router.get("/profile",           userCtrl.getProfile);

router.put("/profile",           userCtrl.updateProfile);

router.put("/profile/password",  userCtrl.changePassword);

router.get("/profile/bookings",  userCtrl.getBookingHistory);

module.exports = router;
