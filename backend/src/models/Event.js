const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Event = sequelize.define("Event", {
  id:           { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  organizer_id: { type: DataTypes.INTEGER, defaultValue: null },
  title:        { type: DataTypes.STRING(200), allowNull: false },
  description:  { type: DataTypes.TEXT },
  location:     { type: DataTypes.STRING(150) },
  event_date:   { type: DataTypes.DATE, allowNull: false },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  total_tickets:     { type: DataTypes.INTEGER, allowNull: false },
  available_tickets: { type: DataTypes.INTEGER, allowNull: false },
  category: {
    type: DataTypes.STRING(100),
    defaultValue: "Other",
  },
  is_featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  status: {
    type: DataTypes.ENUM("pending", "approved", "rejected"),
    allowNull: false,
    defaultValue: "approved",
  },
  moderation_note: { type: DataTypes.TEXT, defaultValue: null },
  moderated_at:    { type: DataTypes.DATE, defaultValue: null },
  moderated_by:    { type: DataTypes.INTEGER, defaultValue: null },
  images: {
    type: DataTypes.TEXT("long"),
    defaultValue: null,
    get() {
      const raw = this.getDataValue("images");
      if (!raw) return [];
      try { return JSON.parse(raw); } catch { return []; }
    },
    set(val) {
      this.setDataValue("images", val ? JSON.stringify(val) : null);
    },
  },

  // Feature 2 — City selector for search filters
  city: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null },

  // Feature 5 — Reviews & ratings cache
  average_rating: { type: DataTypes.DECIMAL(3,1), allowNull: true, defaultValue: null },
  review_count:   { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: "events",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = Event;
