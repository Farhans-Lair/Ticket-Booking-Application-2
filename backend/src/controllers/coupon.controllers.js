/**
 * coupon.controllers.js — Feature 4: Coupon / discount system
 *
 * POST /coupons/validate      → preview discount (no DB write, no auth required)
 * POST /coupons               → admin: create coupon
 * GET  /coupons               → admin: list all coupons
 * PATCH /coupons/:id/status   → admin: toggle active / inactive
 */
const couponService = require("../services/coupon.services");
const logger        = require("../config/logger");

/* ─── Validate (user-facing, safe to call on keystroke) ──────────────────── */
const validateCoupon = async (req, res, next) => {
  try {
    const { code, orderAmount } = req.body || {};
    if (!code) return res.status(400).json({ valid: false, reason: "Code is required." });

    const userId = req.user?.id || -1;
    const result = await couponService.validate(code, userId, parseFloat(orderAmount) || 0);
    res.json(result);
  } catch (err) { next(err); }
};

/* ─── Admin: create ───────────────────────────────────────────────────────── */
const createCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.create(req.body);
    res.status(201).json(coupon);
  } catch (err) {
    err.statusCode = 400;
    next(err);
  }
};

/* ─── Admin: list ─────────────────────────────────────────────────────────── */
const getAllCoupons = async (req, res, next) => {
  try {
    res.json(await couponService.getAll());
  } catch (err) { next(err); }
};

/* ─── Admin: set status ───────────────────────────────────────────────────── */
const setCouponStatus = async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: "Status is required." });
    const coupon = await couponService.setStatus(req.params.id, status);
    res.json(coupon);
  } catch (err) {
    err.statusCode = 400;
    next(err);
  }
};

module.exports = { validateCoupon, createCoupon, getAllCoupons, setCouponStatus };
