const { Op, fn, col, literal } = require("sequelize");
const Event    = require("../models/Event");
const { Seat, Booking } = require("../models");

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

const createEvent = async (eventData) => {
  const event = await Event.create(eventData);
  const seats = generateSeats(event.id, event.total_tickets);
  await Seat.bulkCreate(seats);
  return event;
};

const getAllEvents = async (category) => {
  const where = { status: "approved" };
  if (category) where.category = category;
  return Event.findAll({ where, order: [["event_date", "ASC"]] });
};

const getFeaturedEvents = async (limit = 8) => {
  return Event.findAll({
    where: {
      status:      "approved",
      is_featured: true,
      event_date:  { [Op.gte]: new Date() },
    },
    order: [["event_date", "ASC"]],
    limit,
  });
};

const getTrendingEvents = async (limit = 6) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const bookingCounts = await Booking.findAll({
    attributes: [
      "event_id",
      [fn("COUNT", col("id")), "booking_count"],
    ],
    where: {
      payment_status: "paid",
      booking_date:   { [Op.gte]: thirtyDaysAgo },
    },
    group: ["event_id"],
    order: [[literal("booking_count"), "DESC"]],
    limit,
    raw: true,
  });

  if (!bookingCounts.length) return [];

  const eventIds = bookingCounts.map((r) => r.event_id);
  const events   = await Event.findAll({
    where: { id: { [Op.in]: eventIds }, status: "approved" },
  });

  return eventIds
    .map((id) => events.find((e) => e.id === id))
    .filter(Boolean);
};

const updateEvent = async (id, data, organizerId = null) => {
  const where = { id };
  if (organizerId) where.organizer_id = organizerId;

  const event = await Event.findOne({ where });
  if (!event) return null;

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
    is_featured:       data.is_featured !== undefined ? data.is_featured : event.is_featured,
  });

  return event;
};

const deleteEvent = async (id, organizerId = null) => {
  const where = { id };
  if (organizerId) where.organizer_id = organizerId;

  const result = await Event.destroy({ where });
  return result > 0;
};

const getPendingEvents = async () => {
  return Event.findAll({
    where: { status: "pending" },
    order: [["created_at", "ASC"]],
  });
};

const getAllEventsForAdmin = async () => {
  return Event.findAll({ order: [["created_at", "DESC"]] });
};

const approveEvent = async (eventId, adminId, note = null) => {
  const event = await Event.findByPk(eventId);
  if (!event) return null;
  await event.update({
    status:          "approved",
    moderation_note: note,
    moderated_at:    new Date(),
    moderated_by:    adminId,
  });
  return event;
};

const rejectEvent = async (eventId, adminId, note = null) => {
  const event = await Event.findByPk(eventId);
  if (!event) return null;
  await event.update({
    status:          "rejected",
    moderation_note: note,
    moderated_at:    new Date(),
    moderated_by:    adminId,
  });
  return event;
};

module.exports = {
  createEvent,
  updateEvent,
  getAllEvents,
  deleteEvent,
  getFeaturedEvents,
  getTrendingEvents,
  getPendingEvents,
  getAllEventsForAdmin,
  approveEvent,
  rejectEvent,
};
