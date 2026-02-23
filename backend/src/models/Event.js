const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Event = sequelize.define("Event", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  location: {
    type: DataTypes.STRING(150),
  },
  event_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },

  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
     validate: {
      min: 0
    }
  },

  total_tickets: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  available_tickets: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
},

{
  tableName: "events",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = Event;
