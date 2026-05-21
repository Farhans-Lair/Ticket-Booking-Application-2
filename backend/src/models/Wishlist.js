/**
 * Wishlist model — Feature 6: Wishlist / save event
 *
 * notify_on_availability = true → send email when a ticket opens up
 * (after a cancellation frees capacity on a sold-out event).
 */
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Wishlist = sequelize.define("Wishlist", {
  id:       { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id:  { type: DataTypes.INTEGER, allowNull: false },
  event_id: { type: DataTypes.INTEGER, allowNull: false },
  notify_on_availability: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: "wishlists",
  timestamps: true,
  createdAt: "saved_at",
  updatedAt: false,
  indexes: [
    { unique: true, fields: ["user_id", "event_id"], name: "uq_wishlist_user_event" },
  ],
});

module.exports = Wishlist;
