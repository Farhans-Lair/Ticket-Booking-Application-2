const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Seat = sequelize.define("Seat", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  seat_number: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  // Seat tier / category for tiered pricing
  seat_tier: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: "General",
  },
  tier_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  // Feature 1 — Seat hold: available | booked | held
  status: {
    type: DataTypes.ENUM("available", "booked", "held"),
    defaultValue: "available",
  },
  // Feature 1 — timestamp until which this seat is held
  held_until: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  // Feature 1 — user who holds this seat during checkout
  held_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
}, {
  tableName: "seats",
  timestamps: false,
});

module.exports = Seat;
