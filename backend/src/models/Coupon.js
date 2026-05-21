/**
 * Coupon model — Feature 4: Coupon / discount system
 *
 * discount_type = "percent" → discount_value is a percentage (e.g. 15 = 15%)
 *                             max_discount caps the absolute rupee saving.
 * discount_type = "flat"    → discount_value is a fixed rupee amount off.
 *
 * usage_limit    → total redemptions allowed across all users (0 = unlimited).
 * per_user_limit → how many times one user can use this code (0 = unlimited).
 * usage_count    → current total redemptions (incremented atomically).
 */
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Coupon = sequelize.define("Coupon", {
  id:   { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  code: { type: DataTypes.STRING(50), allowNull: false, unique: true },

  discount_type: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { isIn: [["percent", "flat"]] },
  },
  discount_value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  min_amount:     { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
  max_discount:   { type: DataTypes.DECIMAL(10, 2), allowNull: true,  defaultValue: null },

  valid_from: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  valid_to:   { type: DataTypes.DATE, allowNull: true, defaultValue: null },

  usage_limit:    { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  per_user_limit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  usage_count:    { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "active",
    validate: { isIn: [["active", "inactive", "expired"]] },
  },
}, {
  tableName: "coupons",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = Coupon;
