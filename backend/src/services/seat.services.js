const { Seat } = require("../models");
const { Op }   = require("sequelize");

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

  // Build tier summary map: { tierName: { price, total, available } }
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
 Called by organizer after event creation.
 tiers = [{ name, price, rows }]  e.g. [{ name:"VIP", price:1500, rows:["A","B"] }]
====================================================
*/
const assignSeatTiers = async (eventId, organizerId, tiers) => {
  // Verify event ownership if organizerId provided
  if (organizerId) {
    const { Event } = require("../models");
    const event = await Event.findOne({ where: { id: eventId, organizer_id: organizerId } });
    if (!event) throw new Error("Event not found or you do not own this event.");
  }

  // Apply each tier rule
  for (const tier of tiers) {
    const { name, price, rows } = tier;
    if (!name || price == null || !rows || !rows.length) continue;

    // Build seat_number LIKE patterns for each row, e.g. row "A" → A1, A2 ...
    const rowConditions = rows.map(r => ({ seat_number: { [Op.like]: `${r.toUpperCase()}%` } }));

    await Seat.update(
      { seat_tier: name, tier_price: parseFloat(price) },
      {
        where: {
          event_id: eventId,
          [Op.or]: rowConditions,
        },
      }
    );
  }

  return getSeatsByEvent(eventId);
};

/*
====================================================
 VALIDATE & LOCK SELECTED SEATS (with tier prices)
====================================================
*/
const bookSeats = async (eventId, seatNumbers, transaction) => {
  const seats = await Seat.findAll({
    where: {
      event_id:    eventId,
      seat_number: seatNumbers,
      status:      "available",
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
    { status: "booked" },
    {
      where: { event_id: eventId, seat_number: seatNumbers },
      transaction,
    }
  );

  return seats;
};

/*
====================================================
 CALCULATE TOTAL PRICE FROM SELECTED SEATS
 Used when event uses tier-based pricing (price === 0)
====================================================
*/
const calculateTierPrice = async (eventId, seatNumbers) => {
  const seats = await Seat.findAll({
    where: { event_id: eventId, seat_number: seatNumbers, status: "available" },
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
    { status: "available" },
    { where: { event_id: eventId, seat_number: seatNumbers }, transaction }
  );
};

module.exports = {
  getSeatsByEvent,
  getSeatTiers,
  assignSeatTiers,
  bookSeats,
  calculateTierPrice,
  releaseSeats,
};
