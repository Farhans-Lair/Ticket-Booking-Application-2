const User = require("./User");
const Event = require("./Event");
const Booking = require("./Booking");

// Relationships
Event.hasMany(Booking, { foreignKey: "event_id" });
Booking.belongsTo(Event, { foreignKey: "event_id" });

User.hasMany(Booking, { foreignKey: "user_id" });
Booking.belongsTo(User, { foreignKey: "user_id" });

module.exports = {
  User,
  Event,
  Booking,
};
