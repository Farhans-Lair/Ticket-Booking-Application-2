/**
 * Review model — Feature 5: Reviews & ratings
 *
 * verified_booking = true  → user has a paid, active booking for this event.
 * Only verified reviews count toward the average_rating on the Event row.
 */
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Review = sequelize.define("Review", {
  id:       { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id:  { type: DataTypes.INTEGER, allowNull: false },
  event_id: { type: DataTypes.INTEGER, allowNull: false },
  rating: {
    type: DataTypes.TINYINT,
    allowNull: false,
    validate: { min: 1, max: 5 },
  },
  review_text:       { type: DataTypes.TEXT,    allowNull: true, defaultValue: null },
  verified_booking:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: "reviews",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
  indexes: [
    { unique: true, fields: ["user_id", "event_id"], name: "uq_review_user_event" },
  ],
});

module.exports = Review;
