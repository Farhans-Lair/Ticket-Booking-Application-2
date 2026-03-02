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
  status: {
    type: DataTypes.ENUM('available', 'booked'),
    defaultValue: 'available',
  },
}, {
  tableName: "seats",
  timestamps: false,
});

module.exports = Seat;
