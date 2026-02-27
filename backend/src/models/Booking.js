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

razorpay_order_id: {
  type: DataTypes.STRING,
  allowNull: true,
},

razorpay_payment_id: {
  type: DataTypes.STRING,
  allowNull: true,
},

payment_status: 
{ type: DataTypes.ENUM('pending', 'paid', 'failed'), 
  defaultValue: 'pending' }
}, {
  tableName: "bookings",
  timestamps: true,
  createdAt: "booking_date",
  updatedAt: false,
});

module.exports = Booking;
