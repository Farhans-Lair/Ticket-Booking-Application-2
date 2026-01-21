const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Booking = sequelize.define("Booking", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  tickets_booked: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: "bookings",
  timestamps: true,
  createdAt: "booking_date",
  updatedAt: false,
});

module.exports = Booking;
