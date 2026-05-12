const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ── Feature 5: Organizer Payout / Settlement ─────────────────────────────────
const Payout = sequelize.define("Payout", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  // The organizer user receiving the payout
  organizer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  // Optional — if payout is for a specific event
  event_id: {
    type: DataTypes.INTEGER,
    defaultValue: null,
  },

  // Gross ticket revenue for this payout
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },

  // Platform fee deducted (e.g. 10% of gross)
  platform_fee: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.0,
  },

  // Net amount transferred to organizer = amount - platform_fee
  net_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },

  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: "INR",
  },

  // pending → created, not yet sent
  // processing → transfer initiated
  // paid → funds received by organizer
  // failed → transfer failed, needs retry
  status: {
    type: DataTypes.ENUM("pending", "processing", "paid", "failed"),
    allowNull: false,
    defaultValue: "pending",
  },

  // 'bank_transfer' | 'upi' | 'cheque' | 'razorpay'
  payment_method: {
    type: DataTypes.STRING(50),
    defaultValue: null,
  },

  // UTR number, UPI transaction ID, cheque number, etc.
  reference_id: {
    type: DataTypes.STRING(255),
    defaultValue: null,
  },

  notes: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },

  // Admin who initiated / processed this payout
  initiated_by: {
    type: DataTypes.INTEGER,
    defaultValue: null,
  },

  paid_at: {
    type: DataTypes.DATE,
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
