/**
 * coupon.routes.js — Feature 4: Coupon / discount system
 */
const express      = require("express");
const router       = express.Router();
const authenticate = require("../middleware/auth.middleware");
const couponCtrl   = require("../controllers/coupon.controllers");

// POST /coupons/validate   → preview discount, no auth required
router.post("/validate",       couponCtrl.validateCoupon);

// POST /coupons             → admin: create coupon
router.post("/",         authenticate, couponCtrl.createCoupon);

// GET  /coupons             → admin: list all
router.get("/",          authenticate, couponCtrl.getAllCoupons);

// PATCH /coupons/:id/status → admin: activate / deactivate
router.patch("/:id/status", authenticate, couponCtrl.setCouponStatus);

module.exports = router;
