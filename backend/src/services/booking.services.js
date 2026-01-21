const sequelize = require("../config/database");
const { Event, Booking } = require("../models");

const bookTickets = async (userId, eventId, ticketsRequested) => {
  const transaction = await sequelize.transaction();

  try {
    // Lock the event row FOR UPDATE
    const event = await Event.findOne({
      where: { id: eventId },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.available_tickets < ticketsRequested) {
      throw new Error("Not enough tickets available");
    }

    // Update available tickets
    event.available_tickets -= ticketsRequested;
    await event.save({ transaction });

    // Create booking
    const booking = await Booking.create(
      {
        user_id: userId,
        event_id: eventId,
        tickets_booked: ticketsRequested,
      },
      { transaction }
    );

    // Commit transaction
    await transaction.commit();

    return booking;
  } catch (error) {
    // Rollback on any failure
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  bookTickets,
};

// GET MY BOOKINGS

const getUserBookings = async (userId) => {
  return Booking.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Event,
        attributes: ["title", "location", "event_date"],
      },
    ],
  });
};

module.exports = {
  bookTickets,
  getUserBookings,
};

