const { Seat } = require("../models");
const { Op }   = require("sequelize");
const sequelize = require("../config/database");
const logger    = require("../config/logger");

const HOLD_MINUTES = 10;

const getSeatsByEvent = async (eventId) => {
  return Seat.findAll({
    where: { event_id: eventId },
    order: [["seat_number", "ASC"]],
  });
};

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

const assignSeatTiers = async (eventId, organizerId, tiers) => {
  if (organizerId) {
    const { Event } = require("../models");
    const event = await Event.findOne({ where: { id: eventId, organizer_id: organizerId } });
    if (!event) throw new Error("Event not found or you do not own this event.");
  }

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

const calculateTierPrice = async (eventId, seatNumbers) => {
  // Temporary diagnostic — remove once resolved. DB data is confirmed
  // correct (verified via direct SQL query); this checks whether the
  // mismatch is in what's actually received/matched at runtime.
  logger.info("calculateTierPrice called", {
    eventId, typeofEventId: typeof eventId,
    seatNumbers, typeofSeatNumbers: typeof seatNumbers,
    isArray: Array.isArray(seatNumbers),
  });

  const seats = await Seat.findAll({
    where: {
      event_id:    eventId,
      seat_number: seatNumbers,
      status:      { [Op.in]: ["available", "held"] },
    },
    attributes: ["seat_number", "seat_tier", "tier_price"],
  });

  logger.info("calculateTierPrice matched seats", {
    matchedCount: seats.length,
    seats: seats.map(s => ({
      seat_number: s.seat_number,
      tier_price: s.tier_price,
      typeofTierPrice: typeof s.tier_price,
    })),
  });

  if (seats.length !== seatNumbers.length) {
    throw new Error("One or more seats are unavailable.");
  }

  const total = seats.reduce((sum, s) => sum + parseFloat(s.tier_price), 0);
  return { seats, total };
};

const releaseSeats = async (eventId, seatNumbers, transaction) => {
  if (!seatNumbers || seatNumbers.length === 0) return;
  await Seat.update(
    { status: "available", held_until: null, held_by_user_id: null },
    { where: { event_id: eventId, seat_number: seatNumbers }, transaction }
  );
};

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
