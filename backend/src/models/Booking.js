const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Booking = sequelize.define("Booking", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
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
},

selected_seats: {
  type: DataTypes.TEXT,   // stored as JSON string e.g. '["A1","A2"]'
  allowNull: true,
},

razorpay_order_id: {
  type: DataTypes.STRING,
  allowNull: true,
},

razorpay_payment_id: {
  type: DataTypes.STRING,
  allowNull: true,
},

payment_status: { type: DataTypes.ENUM('pending', 'paid', 'failed'), 
  defaultValue: 'pending',
}, 

cancellation_status: {
  type: DataTypes.ENUM('active', 'cancelled', 'refund_pending', 'refunded'),
  allowNull: false,
  defaultValue: 'active',
},

refund_amount: {
  type: DataTypes.FLOAT,
  allowNull: true,
  defaultValue: null,
},

razorpay_refund_id: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: null,
},

cancelled_at: {
  type: DataTypes.DATE,
  allowNull: true,
  defaultValue: null,
},

/**
 * 5% of (ticket_amount + convenience_fee), exclusive of GST.
 * Charged on every cancellation regardless of tier.
 */
cancellation_fee: {
  type: DataTypes.FLOAT,
  allowNull: true,
  defaultValue: null,
},

/**
 * 5% GST levied on the cancellation_fee.
 */
cancellation_fee_gst: {
  type: DataTypes.FLOAT,
  allowNull: true,
  defaultValue: null,
},

/**
 * The hours_before value of the matched policy tier at cancellation time.
 * ≥ 72 → high tier: convenience fee refunded, only cancellation charges retained.
 *  < 72 → low tier : convenience fee retained by platform.
 */
applied_tier_hours: {
  type: DataTypes.INTEGER,
  allowNull: true,
  defaultValue: null,
},


/**
   * S3 object key for the generated ticket PDF.
   * e.g.  "tickets/booking-42-user-7.pdf"
   * NULL  → PDF was never uploaded (fallback: generate on-the-fly on download).
   */
  ticket_pdf_s3_key:
   {
    type: DataTypes.STRING(512),
    allowNull: true,
    defaultValue: null,
  },

/**
   * S3 key for the booking invoice PDF.
   * Generated and uploaded when payment is verified (verifyPayment event).
   * NULL → invoice was never uploaded (fallback: generate on-the-fly).
   */
  booking_invoice_s3_key: {
    type: DataTypes.STRING(512),
    allowNull: true,
    defaultValue: null,
  },

  /**
   * S3 key for the cancellation invoice PDF.
   * Generated and uploaded when booking is cancelled (cancelBooking event).
   * NULL → invoice was never uploaded (fallback: generate on-the-fly).
   */
  cancellation_invoice_s3_key: {
    type: DataTypes.STRING(512),
    allowNull: true,
    defaultValue: null,
  },
},

{
  tableName: "bookings",
  timestamps: true,
  createdAt: "booking_date",
  updatedAt: false,
});

module.exports = Booking;
