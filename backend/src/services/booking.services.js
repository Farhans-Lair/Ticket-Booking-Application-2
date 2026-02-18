const sequelize = require("../config/database");
const { Event, Booking } = require("../models");



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

const getUserBookings = async (userId) => {
  return await Booking.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Event,
        attributes: ["title", "event_date", "price"]
      }
    ],
    order: [["createdAt", "DESC"]]
  });
};


module.exports = {
  createBooking,
  getUserBookings
};
