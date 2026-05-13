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
  // FIX Issue 4: seat tiers for tiered pricing
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
  status: {
    type: DataTypes.ENUM("available", "booked"),
    defaultValue: "available",
  },
}, {
  tableName: "seats",
  timestamps: false,
});

module.exports = Seat;
