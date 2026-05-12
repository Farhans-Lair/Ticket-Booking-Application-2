const User               = require("./User");
const Event              = require("./Event");
const Booking            = require("./Booking");
const Seat               = require("./Seat");
const OrganizerProfile   = require("./OrganizerProfile");
const CancellationPolicy = require("./CancellationPolicy");
const Payout             = require("./Payout");           // Feature 5

// ── Core booking relationships ──────────────────────────────
Event.hasMany(Booking,   { foreignKey: "event_id" });
Booking.belongsTo(Event, { foreignKey: "event_id" });

User.hasMany(Booking,    { foreignKey: "user_id" });
Booking.belongsTo(User,  { foreignKey: "user_id" });

Event.hasMany(Seat,      { foreignKey: "event_id" });
Seat.belongsTo(Event,    { foreignKey: "event_id" });

// ── Organizer relationships ──────────────────────────────────
User.hasOne(OrganizerProfile,    { foreignKey: "user_id" });
OrganizerProfile.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(Event,  { foreignKey: "organizer_id", as: "OrganizerEvents" });
Event.belongsTo(User, { foreignKey: "organizer_id", as: "Organizer" });

// ── Cancellation Policy relationships ───────────────────────
Event.hasOne(CancellationPolicy,        { foreignKey: "event_id", as: "CancellationPolicy" });
CancellationPolicy.belongsTo(Event,     { foreignKey: "event_id" });
CancellationPolicy.belongsTo(User,      { foreignKey: "organizer_id", as: "Organizer" });

// ── Feature 4: Moderation — admin who moderated an event ────
User.hasMany(Event, { foreignKey: "moderated_by", as: "ModeratedEvents" });
Event.belongsTo(User, { foreignKey: "moderated_by", as: "Moderator" });

// ── Feature 5: Payout relationships ─────────────────────────
User.hasMany(Payout,    { foreignKey: "organizer_id", as: "ReceivedPayouts" });
Payout.belongsTo(User,  { foreignKey: "organizer_id", as: "Organizer" });

Event.hasMany(Payout,   { foreignKey: "event_id", as: "Payouts" });
Payout.belongsTo(Event, { foreignKey: "event_id" });

User.hasMany(Payout,    { foreignKey: "initiated_by", as: "InitiatedPayouts" });
Payout.belongsTo(User,  { foreignKey: "initiated_by", as: "InitiatedBy" });

module.exports = {
  User,
  Event,
  Booking,
  Seat,
  OrganizerProfile,
  CancellationPolicy,
  Payout,
};
