/**
 * WaitlistEntry model — Feature 7: Waitlist for sold-out events
 *
 * tickets_wanted → how many seats the user needs (for grouped-release matching).
 * notified_at    → stamped when the availability email is dispatched.
 * status         → waiting | notified | converted | expired
 */
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const WaitlistEntry = sequelize.define("WaitlistEntry", {
  id:       { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id:  { type: DataTypes.INTEGER, allowNull: false },
  event_id: { type: DataTypes.INTEGER, allowNull: false },
  tickets_wanted: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  notified_at:    { type: DataTypes.DATE,    allowNull: true, defaultValue: null },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "waiting",
  },
}, {
  tableName: "waitlist",
  timestamps: true,
  createdAt: "joined_at",
  updatedAt: false,
  indexes: [
    { unique: true, fields: ["user_id", "event_id"], name: "uq_waitlist_user_event" },
  ],
});

module.exports = WaitlistEntry;
