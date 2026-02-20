const sequelize = require("../config/database");
const { Event, Booking } = require("../models");



/*
====================================================
 CREATE BOOKING WITH REVENUE CALCULATION
====================================================
*/

const createBooking = async (
  userId,
  eventId,
  tickets_booked
) => {

  return await sequelize.transaction(async (t) => {

    const event =
      await Event.findByPk(eventId, {

        transaction: t,
        lock: t.LOCK.UPDATE

      });

    if (!event) {

      throw new Error("Event not found");

    }

    if (
      event.available_tickets <
      tickets_booked
    ) {

      throw new Error(
        "Not enough tickets available"
      );

    }

    /*
    ==========================================
     Reduce Available Tickets
    ==========================================
    */

    event.available_tickets -= tickets_booked;

    await event.save({
      transaction: t
    });

    /*
    ==========================================
     REVENUE CALCULATION
    ==========================================
    */

    // Ticket Revenue (Organizer earns this)

    const ticketAmount =
      event.price *
      tickets_booked;

    /*
    Platform Charges
    */

    const convenienceFeePerTicket = 20;

    const convenienceFee =
      convenienceFeePerTicket *
      tickets_booked;


    /*
    GST on Convenience Fee
    */

    const gstRate = 0.18;

    const gstAmount =
      convenienceFee *
      gstRate;


    /*
    Total Customer Payment
    */

    const totalPaid =
      ticketAmount +
      convenienceFee +
      gstAmount;



    /*
    ==========================================
     CREATE BOOKING
    ==========================================
    */

    const booking =
      await Booking.create({

        user_id: userId,

        event_id: eventId,

        tickets_booked,

        ticket_amount:
          ticketAmount,

        convenience_fee:
          convenienceFee,

        gst_amount:
          gstAmount,

        total_paid:
          totalPaid

      },
      {
        transaction: t
      });


    return booking;

  });

};



/*
====================================================
 USER BOOKINGS VIEW
====================================================
*/

const getUserBookings = async (userId) => {

  return await Booking.findAll({

    where: { user_id: userId },

    include: [

      {
        model: Event,

        attributes: [
          "title",
          "event_date",
          "price"
        ]

      }

    ],

    order: [

      ["booking_date", "DESC"]

    ]

  });

};



module.exports = {

  createBooking,

  getUserBookings

};