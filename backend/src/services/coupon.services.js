/**
 * coupon.services.js — Feature 4: Coupon / discount system
 */
const { Coupon, Booking } = require("../models");
const { Op }              = require("sequelize");
const logger              = require("../config/logger");

/* ─── Admin CRUD ──────────────────────────────────────────────────────────── */

const create = async (couponData) => {
  const existing = await Coupon.findOne({
    where: { code: { [Op.like]: couponData.code } },
  });
  if (existing) throw new Error(`Coupon code already exists: ${couponData.code}`);
  const saved = await Coupon.create(couponData);
  logger.info("Coupon created", { code: saved.code, type: saved.discount_type });
  return saved;
};

const getAll = () => Coupon.findAll({ order: [["created_at", "DESC"]] });

const setStatus = async (id, status) => {
  const coupon = await Coupon.findByPk(id);
  if (!coupon) throw new Error("Coupon not found");
  await coupon.update({ status });
  return coupon;
};

/* ─── Validate (no DB write — safe to call on keystroke) ─────────────────── */

/**
 * Returns { valid, discountAmount, finalAmount } or { valid: false, reason }.
 * @param code        coupon code from user input
 * @param userId      authenticated user id (for per_user_limit check; use -1 for guests)
 * @param orderAmount total order amount BEFORE coupon (rupees)
 */
const validate = async (code, userId, orderAmount) => {
  const coupon = await Coupon.findOne({
    where: { code: { [Op.like]: code.trim() } },
  });

  if (!coupon) return _invalid("Coupon code not found.");
  if (coupon.status !== "active") return _invalid(`This coupon is ${coupon.status}.`);

  const now = new Date();
  if (coupon.valid_from && now < new Date(coupon.valid_from))
    return _invalid("This coupon is not active yet.");
  if (coupon.valid_to && now > new Date(coupon.valid_to))
    return _invalid("This coupon has expired.");

  if (coupon.min_amount && orderAmount < parseFloat(coupon.min_amount))
    return _invalid(`Minimum order amount for this coupon is ₹${parseFloat(coupon.min_amount).toFixed(0)}.`);

  if (coupon.usage_limit > 0 && coupon.usage_count >= coupon.usage_limit)
    return _invalid("This coupon has reached its usage limit.");

  if (coupon.per_user_limit > 0 && userId > 0) {
    const userUses = await Booking.count({
      where: {
        user_id:             userId,
        coupon_code:         coupon.code,
        payment_status:      "paid",
        cancellation_status: "active",
      },
    });
    if (userUses >= coupon.per_user_limit)
      return _invalid("You have already used this coupon the maximum number of times.");
  }

  const discount   = _calculateDiscount(coupon, orderAmount);
  const finalAmount = Math.max(0, orderAmount - discount);

  return {
    valid:         true,
    code:          coupon.code,
    discountAmount: Math.round(discount     * 100) / 100,
    finalAmount:    Math.round(finalAmount  * 100) / 100,
    discountType:   coupon.discount_type,
    discountValue:  parseFloat(coupon.discount_value),
  };
};

/**
 * Atomically redeems a coupon — increments usage_count.
 * Call inside the booking transaction.  Returns the rupee discount applied.
 */
const redeem = async (code, userId, orderAmount, transaction) => {
  const coupon = await Coupon.findOne({
    where: { code: { [Op.like]: code.trim() } },
    lock:  transaction ? transaction.LOCK.UPDATE : undefined,
    transaction,
  });
  if (!coupon) throw new Error("Coupon not found.");

  // Re-validate inside transaction (another thread may have exhausted it)
  const check = await validate(code, userId, orderAmount);
  if (!check.valid) throw new Error(check.reason);

  // Atomic increment guarded by usage_limit check
  const [updated] = await Coupon.update(
    { usage_count: coupon.usage_count + 1 },
    {
      where: {
        id: coupon.id,
        ...(coupon.usage_limit > 0
          ? { usage_count: { [Op.lt]: coupon.usage_limit } }
          : {}),
      },
      transaction,
    }
  );
  if (updated === 0) throw new Error("Coupon just ran out. Please try another code.");

  const discount = _calculateDiscount(coupon, orderAmount);
  logger.info("Coupon redeemed", { code, userId, discount });
  return Math.round(discount * 100) / 100;
};

/* ─── Private helpers ─────────────────────────────────────────────────────── */

const _calculateDiscount = (coupon, orderAmount) => {
  let discount;
  if (coupon.discount_type === "percent") {
    discount = orderAmount * (parseFloat(coupon.discount_value) / 100);
    if (coupon.max_discount && discount > parseFloat(coupon.max_discount))
      discount = parseFloat(coupon.max_discount);
  } else {
    discount = parseFloat(coupon.discount_value);
  }
  return Math.min(discount, orderAmount);
};

const _invalid = (reason) => ({ valid: false, reason, discountAmount: 0 });

module.exports = { create, getAll, setStatus, validate, redeem };
