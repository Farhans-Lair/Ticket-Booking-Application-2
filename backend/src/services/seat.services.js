const { Seat } = require("../models");
const { Op }   = require("sequelize");
const sequelize = require("../config/database");

const HOLD_MINUTES = 10;

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
 GET SEATS GROUPED BY TIER (for seat-selection UI)
====================================================
*/
const getSeatTiers = async (eventId) => {
  const seats = await Seat.findAll({
    where:  { event_id: eventId },
    order:  [["seat_tier", "ASC"], ["seat_number", "ASC"]],
    attributes: ["id", "seat_number", "seat_tier", "tier_price", "status"],
  });

  const tierMap = {};
  seats.forEach(s => {
    if (!tierMap[s.seat_tier]) {
      tierMap[s.seat_tier] = { tier: s.seat_tier, price: parseFloat(s.tier_price), total: 0, available: 0 };
    }
    tierMap[s.seat_tier].total++;
    if (s.status === "available") tierMap[s.seat_tier].available++;
  });

  return { seats, tiers: Object.values(tierMap) };
};

/*
====================================================
 ASSIGN SEAT TIERS TO EXISTING SEATS
 FIX: Reset ALL seats to "Unassigned" first so that
 seats not covered by the new tier rules don't keep
 their old tier name (e.g. stale "General" entries).
====================================================
*/
const assignSeatTiers = async (eventId, organizerId, tiers) => {
  if (organizerId) {
    const { Event } = require("../models");
    const event = await Event.findOne({ where: { id: eventId, organizer_id: organizerId } });
    if (!event) throw new Error("Event not found or you do not own this event.");
  }

  // Step 1: Reset every available seat for this event to a neutral baseline.
  // Only reset 'available' seats — never touch booked or held seats.
  await Seat.update(
    { seat_tier: "General", tier_price: 0 },
    { where: { event_id: eventId, status: "available" } }
  );

  // Step 2: Apply each tier rule on top of the clean baseline.
  for (const tier of tiers) {
    const { name, price, rows } = tier;
    if (!name || price == null || !rows || !rows.length) continue;

    const rowConditions = rows.map(r => ({ seat_number: { [Op.like]: `${r.toUpperCase()}%` } }));

    await Seat.update(
      { seat_tier: name, tier_price: parseFloat(price) },
      { where: { event_id: eventId, [Op.or]: rowConditions } }
    );
  }

  return getSeatsByEvent(eventId);
};

/*
====================================================
 VALIDATE & LOCK SELECTED SEATS
====================================================
*/
const bookSeats = async (eventId, seatNumbers, transaction) => {
  const seats = await Seat.findAll({
    where: {
      event_id:    eventId,
      seat_number: seatNumbers,
      status:      { [Op.in]: ["available", "held"] },
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (seats.length !== seatNumbers.length) {
    throw new Error(
      "One or more selected seats are no longer available. Please select different seats."
    );
  }

  await Seat.update(
    { status: "booked", held_until: null, held_by_user_id: null },
    { where: { event_id: eventId, seat_number: seatNumbers }, transaction }
  );

  return seats;
};

/*
====================================================
 CALCULATE TOTAL PRICE FROM SELECTED SEATS
====================================================
*/
const calculateTierPrice = async (eventId, seatNumbers) => {
  const seats = await Seat.findAll({
    where: {
      event_id:    eventId,
      seat_number: seatNumbers,
      status:      { [Op.in]: ["available", "held"] },
    },
    attributes: ["seat_number", "seat_tier", "tier_price"],
  });

  if (seats.length !== seatNumbers.length) {
    throw new Error("One or more seats are unavailable.");
  }

  const total = seats.reduce((sum, s) => sum + parseFloat(s.tier_price), 0);
  return { seats, total };
};

/*
====================================================
 RELEASE SEATS BACK TO AVAILABLE
====================================================
*/
const releaseSeats = async (eventId, seatNumbers, transaction) => {
  if (!seatNumbers || seatNumbers.length === 0) return;
  await Seat.update(
    { status: "available", held_until: null, held_by_user_id: null },
    { where: { event_id: eventId, seat_number: seatNumbers }, transaction }
  );
};

/*
====================================================
 HOLD SEATS — Feature 1
====================================================
*/
const holdSeats = async (eventId, seatNumbers, userId) => {
  return sequelize.transaction(async (t) => {
    await Seat.update(
      { status: "available", held_until: null, held_by_user_id: null },
      {
        where: { event_id: eventId, held_by_user_id: userId, status: "held" },
        transaction: t,
      }
    );

    const available = await Seat.findAll({
      where: { event_id: eventId, seat_number: seatNumbers, status: "available" },
      lock:  t.LOCK.UPDATE,
      transaction: t,
    });

    if (available.length !== seatNumbers.length) {
      throw new Error(
        "One or more seats are no longer available. Please select different seats."
      );
    }

    const heldUntil = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

    await Seat.update(
      { status: "held", held_until: heldUntil, held_by_user_id: userId },
      {
        where: { event_id: eventId, seat_number: seatNumbers, status: "available" },
        transaction: t,
      }
    );

    return { heldUntil, seatNumbers };
  });
};

/*
====================================================
 RELEASE EXPIRED HOLDS — called by cron every minute
====================================================
*/
const releaseExpiredHolds = async () => {
  const [count] = await Seat.update(
    { status: "available", held_until: null, held_by_user_id: null },
    { where: { status: "held", held_until: { [Op.lt]: new Date() } } }
  );
  return count;
};

module.exports = {
  getSeatsByEvent,
  getSeatTiers,
  assignSeatTiers,
  bookSeats,
  calculateTierPrice,
  releaseSeats,
  holdSeats,
  releaseExpiredHolds,
};
