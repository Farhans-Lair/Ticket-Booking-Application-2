const express      = require("express");
const router       = express.Router();
const authenticate = require("../middleware/auth.middleware");
const couponCtrl   = require("../controllers/coupon.controllers");

router.post("/validate",       couponCtrl.validateCoupon);

router.post("/",         authenticate, couponCtrl.createCoupon);

router.get("/",          authenticate, couponCtrl.getAllCoupons);

router.patch("/:id/status", authenticate, couponCtrl.setCouponStatus);

module.exports = router;
