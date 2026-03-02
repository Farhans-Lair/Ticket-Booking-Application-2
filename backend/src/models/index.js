const User = require("./User");
const Event = require("./Event");
const Booking = require("./Booking");
const Seat = require ("./Seat")

// Relationships
Event.hasMany(Booking, { foreignKey: "event_id" });
Booking.belongsTo(Event, { foreignKey: "event_id" });

User.hasMany(Booking, { foreignKey: "user_id" });
Booking.belongsTo(User, { foreignKey: "user_id" });

Event.hasMany(Seat, { foreignKey: "event_id" });
Seat.belongsTo(Event, { foreignKey: "event_id" });

module.exports = {
  User,
  Event,
  Booking,
  Seat,
};
