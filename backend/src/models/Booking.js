const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Booking = sequelize.define("Booking", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
<<<<<<< HEAD
  user_id:        { type: DataTypes.INTEGER, allowNull: false },
  event_id:       { type: DataTypes.INTEGER, allowNull: false },
  tickets_booked: { type: DataTypes.INTEGER, allowNull: false },

  ticket_amount:   { type: DataTypes.FLOAT, allowNull: false },
  convenience_fee: { type: DataTypes.FLOAT, allowNull: false },
  gst_amount:      { type: DataTypes.FLOAT, allowNull: false },
  total_paid:      { type: DataTypes.FLOAT, allowNull: false },

  selected_seats:      { type: DataTypes.TEXT,   allowNull: true },
  razorpay_order_id:   { type: DataTypes.STRING, allowNull: true },
  razorpay_payment_id: { type: DataTypes.STRING, allowNull: true },

  payment_status: {
    type: DataTypes.ENUM("pending", "paid", "failed"),
    defaultValue: "pending",
  },
  cancellation_status: {
    type: DataTypes.ENUM("active", "cancelled", "refund_pending", "refunded"),
    allowNull: false,
    defaultValue: "active",
  },

  refund_amount:      { type: DataTypes.FLOAT,   allowNull: true, defaultValue: null },
  razorpay_refund_id: { type: DataTypes.STRING,  allowNull: true, defaultValue: null },
  cancelled_at:       { type: DataTypes.DATE,    allowNull: true, defaultValue: null },
  cancellation_fee:   { type: DataTypes.FLOAT,   allowNull: true, defaultValue: null },
  cancellation_fee_gst:{ type: DataTypes.FLOAT,  allowNull: true, defaultValue: null },
  applied_tier_hours: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },

  ticket_pdf_s3_key:           { type: DataTypes.STRING(512), allowNull: true, defaultValue: null },
  booking_invoice_s3_key:      { type: DataTypes.STRING(512), allowNull: true, defaultValue: null },
  cancellation_invoice_s3_key: { type: DataTypes.STRING(512), allowNull: true, defaultValue: null },

  // Feature 3 — QR-code tickets + check-in
  qr_token:       { type: DataTypes.TEXT,    allowNull: true, defaultValue: null },
  checked_in:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  checked_in_at:  { type: DataTypes.DATE,    allowNull: true, defaultValue: null },

  // Feature 4 — Coupon / discount
  coupon_code:     { type: DataTypes.STRING(50),    allowNull: true, defaultValue: null },
  discount_amount: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0.00 },
=======
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tickets_booked: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  ticket_amount:{
 type:DataTypes.FLOAT,
 allowNull:false
},

convenience_fee:{
 type:DataTypes.FLOAT,
 allowNull:false
},

gst_amount:{
 type:DataTypes.FLOAT,
 allowNull:false
},

total_paid:{
 type:DataTypes.FLOAT,
 allowNull:false
}
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
}, {
  tableName: "bookings",
  timestamps: true,
  createdAt: "booking_date",
  updatedAt: false,
});

module.exports = Booking;
