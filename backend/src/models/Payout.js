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

  // ── Financials ─────────────────────────────────────────────
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,                  // gross ticket revenue
  },
  platform_fee: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,               // 10% of amount
  },
  net_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,                  // amount - platform_fee
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: "INR",
  },

  // ── Status ─────────────────────────────────────────────────
  // pending    = created / requested, not yet processed
  // processing = transfer initiated by admin
  // paid       = funds received by organizer
  // failed     = transfer failed
  status: {
    type: DataTypes.ENUM("pending", "processing", "paid", "failed"),
    allowNull: false,
    defaultValue: "pending",
  },

  // ── Payment details ────────────────────────────────────────
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null,               // bank_transfer | upi | razorpay | cheque
  },
  reference_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,               // UTR / UPI txn / cheque number
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  },

  // ── Admin who processed this payout ────────────────────────
  initiated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },

  // ── Organizer who requested this payout ────────────────────
  requested_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,               // NULL = admin-initiated
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
