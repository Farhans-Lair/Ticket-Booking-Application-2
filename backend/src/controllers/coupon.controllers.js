const couponService = require("../services/coupon.services");
const logger        = require("../config/logger");

const validateCoupon = async (req, res, next) => {
  try {
    const { code, orderAmount } = req.body || {};
    if (!code) return res.status(400).json({ valid: false, reason: "Code is required." });

    const userId = req.user?.id || -1;
    const result = await couponService.validate(code, userId, parseFloat(orderAmount) || 0);
    res.json(result);
  } catch (err) { next(err); }
};

const createCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.create(req.body);
    res.status(201).json(coupon);
  } catch (err) {
    err.statusCode = 400;
    next(err);
  }
};

const getAllCoupons = async (req, res, next) => {
  try {
    res.json(await couponService.getAll());
  } catch (err) { next(err); }
};

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
