const User               = require("./User");
const RefreshToken       = require("./RefreshToken");
const Event              = require("./Event");
const Booking            = require("./Booking");
const Seat               = require("./Seat");
const OrganizerProfile   = require("./OrganizerProfile");
const CancellationPolicy = require("./CancellationPolicy");
const Payout             = require("./Payout");
const EventCategory      = require("./EventCategory");

const Coupon         = require("./Coupon");

const Review         = require("./Review");

const Wishlist       = require("./Wishlist");

const WaitlistEntry  = require("./WaitlistEntry");

User.hasMany(RefreshToken,   { foreignKey: "user_id", as: "RefreshTokens" });
RefreshToken.belongsTo(User, { foreignKey: "user_id" });

Event.hasMany(Booking,   { foreignKey: "event_id" });
Booking.belongsTo(Event, { foreignKey: "event_id" });

User.hasMany(Booking,   { foreignKey: "user_id" });
Booking.belongsTo(User, { foreignKey: "user_id" });

Event.hasMany(Seat,   { foreignKey: "event_id" });
Seat.belongsTo(Event, { foreignKey: "event_id" });

User.hasOne(OrganizerProfile,    { foreignKey: "user_id" });
OrganizerProfile.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(Event,  { foreignKey: "organizer_id", as: "OrganizerEvents" });
Event.belongsTo(User,{ foreignKey: "organizer_id", as: "Organizer" });

Event.hasOne(CancellationPolicy,    { foreignKey: "event_id", as: "CancellationPolicy" });
CancellationPolicy.belongsTo(Event, { foreignKey: "event_id" });
CancellationPolicy.belongsTo(User,  { foreignKey: "organizer_id", as: "Organizer" });

User.hasMany(Event,  { foreignKey: "moderated_by", as: "ModeratedEvents" });
Event.belongsTo(User,{ foreignKey: "moderated_by", as: "Moderator" });

User.hasMany(Payout,   { foreignKey: "organizer_id", as: "ReceivedPayouts" });
Payout.belongsTo(User, { foreignKey: "organizer_id", as: "Organizer" });

Event.hasMany(Payout,  { foreignKey: "event_id", as: "Payouts" });
Payout.belongsTo(Event,{ foreignKey: "event_id" });

User.hasMany(Payout,   { foreignKey: "initiated_by", as: "InitiatedPayouts" });
Payout.belongsTo(User, { foreignKey: "initiated_by", as: "InitiatedBy" });

Event.hasMany(Review,   { foreignKey: "event_id", as: "Reviews" });
Review.belongsTo(Event, { foreignKey: "event_id" });

User.hasMany(Review,   { foreignKey: "user_id", as: "Reviews" });
Review.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(Wishlist,   { foreignKey: "user_id", as: "Wishlist" });
Wishlist.belongsTo(User, { foreignKey: "user_id" });

Event.hasMany(Wishlist,   { foreignKey: "event_id", as: "WishlistedBy" });
Wishlist.belongsTo(Event, { foreignKey: "event_id" });

User.hasMany(WaitlistEntry,   { foreignKey: "user_id", as: "WaitlistEntries" });
WaitlistEntry.belongsTo(User, { foreignKey: "user_id" });

Event.hasMany(WaitlistEntry,   { foreignKey: "event_id", as: "WaitlistEntries" });
WaitlistEntry.belongsTo(Event, { foreignKey: "event_id" });

module.exports = {
  RefreshToken,
  User,
  Event,
  Booking,
  Seat,
  OrganizerProfile,
  CancellationPolicy,
  Payout,
  EventCategory,
  Coupon,
  Review,
  Wishlist,
  WaitlistEntry,
};
