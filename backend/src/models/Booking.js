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
},
{
  tableName: "bookings",
  timestamps: true,
  createdAt: "booking_date",
  updatedAt: false,
});

module.exports = Booking;
