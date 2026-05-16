const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const EventCategory = sequelize.define("EventCategory", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  icon_emoji: {
    type: DataTypes.STRING(10),
    defaultValue: "🎟️",
  },
  image_url: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: "event_categories",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

module.exports = EventCategory;
