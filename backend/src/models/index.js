const User             = require("./User");
const Event            = require("./Event");
const Booking          = require("./Booking");
const Seat             = require("./Seat");
const OrganizerProfile = require("./OrganizerProfile");
const CancellationPolicy  = require("./CancellationPolicy");


// ── Core booking relationships ──────────────────────────────
Event.hasMany(Booking,   { foreignKey: "event_id" });
Booking.belongsTo(Event, { foreignKey: "event_id" });

User.hasMany(Booking,    { foreignKey: "user_id" });
Booking.belongsTo(User,  { foreignKey: "user_id" });

Event.hasMany(Seat,      { foreignKey: "event_id" });
Seat.belongsTo(Event,    { foreignKey: "event_id" });

// ── Organizer relationships ──────────────────────────────────
// Each organizer user has one business profile
User.hasOne(OrganizerProfile,            { foreignKey: "user_id" });
OrganizerProfile.belongsTo(User,         { foreignKey: "user_id" });

// Each event can optionally belong to an organizer user
User.hasMany(Event,      { foreignKey: "organizer_id", as: "OrganizerEvents" });
Event.belongsTo(User,    { foreignKey: "organizer_id", as: "Organizer" });

// ── Cancellation Policy relationships ───────────────────────
// Each event has at most one cancellation policy
Event.hasOne(CancellationPolicy,            { foreignKey: "event_id", as: "CancellationPolicy" });
CancellationPolicy.belongsTo(Event,         { foreignKey: "event_id" });
CancellationPolicy.belongsTo(User,          { foreignKey: "organizer_id", as: "Organizer" });


module.exports = {
  User,
  Event,
  Booking,
  Seat,
  OrganizerProfile,
  CancellationPolicy,
};
