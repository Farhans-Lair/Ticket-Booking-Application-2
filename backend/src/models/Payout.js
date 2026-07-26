const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Payout = sequelize.define("Payout", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  organizer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },

  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  platform_fee: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  net_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: "INR",
  },

  status: {
    type: DataTypes.ENUM("pending", "processing", "paid", "failed"),
    allowNull: false,
    defaultValue: "pending",
  },

  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null,
  },
  reference_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  },

  initiated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },

  requested_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  request_note: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  requested_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },

  paid_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
},
{
  tableName: "payouts",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

module.exports = Payout;
