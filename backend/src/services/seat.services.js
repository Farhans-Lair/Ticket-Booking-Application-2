const { Seat } = require("../models");

/*
====================================================
 GET ALL SEATS FOR AN EVENT
====================================================
*/
const getSeatsByEvent = async (eventId) => {
  return Seat.findAll({
    where: { event_id: eventId },
    order: [["seat_number", "ASC"]],
  });
};

/*
====================================================
 VALIDATE & LOCK SELECTED SEATS
 Called during payment verification.
 Checks that seats are still available and marks them booked.
====================================================
*/
const bookSeats = async (eventId, seatNumbers, transaction) => {
  const seats = await Seat.findAll({
    where: {
      event_id:    eventId,
      seat_number: seatNumbers,
      status:      'available',
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (seats.length !== seatNumbers.length) {
    throw new Error(
      "One or more selected seats are no longer available. Please select different seats."
    );
  }

  // Mark all as booked
  await Seat.update(
    { status: 'booked' },
    {
      where: {
        event_id:    eventId,
        seat_number: seatNumbers,
      },
      transaction,
    }
  );

  return seats;
};

module.exports = {
  getSeatsByEvent,
  bookSeats,
};
