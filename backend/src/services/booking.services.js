const sequelize = require("../config/database");
const Event = require("../models/Event");
const Booking = require("../models/Booking");

const createBooking = async (userId, eventId, tickets_booked) => {

  return await sequelize.transaction(async (t) => {

    const event = await Event.findByPk(eventId, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.available_tickets < tickets_booked) {
      throw new Error("Not enough tickets available");
    }

    event.available_tickets -= tickets_booked;
    await event.save({ transaction: t });

    const booking = await Booking.create({
      user_id: userId,
      event_id: eventId,
      tickets_booked
    }, { transaction: t });

    return booking;
  });
};

module.exports = {
  createBooking
};
