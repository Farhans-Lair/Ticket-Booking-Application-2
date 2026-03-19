const { Op }   = require("sequelize");
const Event    = require("../models/Event");
const { Seat } = require("../models");

/*
====================================================
 GENERATE SEATS FOR AN EVENT
 10 seats per row, rows A–Z (max 260 seats)
====================================================
*/
const generateSeats = (eventId, totalTickets) => {
  const seats       = [];
  const seatsPerRow = 10;
  const rows        = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let count         = 0;

  for (let r = 0; r < rows.length && count < totalTickets; r++) {
    for (let s = 1; s <= seatsPerRow && count < totalTickets; s++) {
      seats.push({ event_id: eventId, seat_number: `${rows[r]}${s}`, status: "available" });
      count++;
    }
  }
  return seats;
};

// ─────────────────────────────────────────────────────────────
// CREATE
// eventData may now include organizer_id (set by the controller).
// ─────────────────────────────────────────────────────────────
const createEvent = async (eventData) => {
  const event = await Event.create(eventData);
  const seats = generateSeats(event.id, event.total_tickets);
  await Seat.bulkCreate(seats);
  return event;
};

// ─────────────────────────────────────────────────────────────
// READ — all events (for the public browse page)
// ─────────────────────────────────────────────────────────────
const getAllEvents = async (category) => {
  const where = category ? { category } : {};
  return Event.findAll({ where, order: [["event_date", "ASC"]] });
};

// ─────────────────────────────────────────────────────────────
// UPDATE
// organizerId is optional:
//   • undefined / null  → called by admin (no ownership check)
//   • a user ID         → called by organizer (must own the event)
// ─────────────────────────────────────────────────────────────
const updateEvent = async (id, data, organizerId = null) => {
  // Build the lookup condition
  const where = { id };
  if (organizerId) where.organizer_id = organizerId; // organizer-scoped

  const event = await Event.findOne({ where });
  if (!event) return null; // 404 — not found or not owned

  /*
  🔥 IMPORTANT BUSINESS RULE
  Tickets already sold must be preserved.
  */
  const soldTickets = event.total_tickets - event.available_tickets;

  if (data.total_tickets && data.total_tickets < soldTickets) {
    throw new Error(`Cannot reduce total tickets below sold count (${soldTickets}).`);
  }

  if (data.total_tickets) {
    const difference = data.total_tickets - event.total_tickets;
    event.available_tickets += difference;

    if (difference > 0) {
      const existingSeats = await Seat.count({ where: { event_id: id } });
      const newSeats = generateSeats(id, data.total_tickets).slice(existingSeats);
      if (newSeats.length > 0) await Seat.bulkCreate(newSeats);
    }
  }

  await event.update({
    title:             data.title             ?? event.title,
    description:       data.description       ?? event.description,
    location:          data.location          ?? event.location,
    price:             data.price             ?? event.price,
    event_date:        data.event_date        ?? event.event_date,
    total_tickets:     data.total_tickets     ?? event.total_tickets,
    available_tickets: event.available_tickets,
    category:          data.category          ?? event.category,
    images:            data.images !== undefined ? data.images : event.images,
  });

  return event;
};

// ─────────────────────────────────────────────────────────────
// DELETE
// organizerId is optional (same scoping logic as updateEvent).
// ─────────────────────────────────────────────────────────────
const deleteEvent = async (id, organizerId = null) => {
  const where = { id };
  if (organizerId) where.organizer_id = organizerId;

  const result = await Event.destroy({ where });
  return result > 0;
};

module.exports = {
  createEvent,
  updateEvent,
  getAllEvents,
  deleteEvent,
};
