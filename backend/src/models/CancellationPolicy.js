const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CancellationPolicy = sequelize.define("CancellationPolicy", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  organizer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
    tiers: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  is_cancellation_allowed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: "cancellation_policies",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

module.exports = CancellationPolicy;
