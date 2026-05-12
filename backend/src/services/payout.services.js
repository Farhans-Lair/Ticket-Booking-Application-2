/**
 * payout.services.js  —  Feature 5: Organizer Payout / Settlement
 *
 * Business rules:
 *  • Platform fee = 10% of gross ticket revenue (ticket_amount only, excl. GST).
 *  • Net payout = gross - platform_fee.
 *  • Admin creates payout records; organizer can only view them.
 *  • A single payout can cover one event or multiple (leave event_id null).
 */

const { Op }      = require("sequelize");
const sequelize   = require("../config/database");
const { Payout, Booking, Event, User, OrganizerProfile } = require("../models");

const PLATFORM_FEE_RATE = 0.10;   // 10%

// ─────────────────────────────────────────────────────────────
// ADMIN: calculate earnable revenue for an organizer/event
// ─────────────────────────────────────────────────────────────
const calculateSettlement = async (organizerId, eventId = null) => {
  const bookingWhere = {
    payment_status:      "paid",
    cancellation_status: { [Op.in]: ["active", "refund_pending"] },
  };

  const eventWhere = { organizer_id: organizerId };
  if (eventId) eventWhere.id = eventId;

  const events = await Event.findAll({ where: eventWhere, attributes: ["id"] });
  if (!events.length) return { gross: 0, platform_fee: 0, net: 0, bookings: 0 };

  const eventIds = events.map((e) => e.id);
  bookingWhere.event_id = { [Op.in]: eventIds };

  const result = await Booking.findOne({
    where: bookingWhere,
    attributes: [
      [sequelize.fn("SUM", sequelize.col("ticket_amount")), "gross"],
      [sequelize.fn("COUNT", sequelize.col("id")),          "booking_count"],
    ],
    raw: true,
  });

  const gross       = parseFloat(result?.gross || 0);
  const platformFee = parseFloat((gross * PLATFORM_FEE_RATE).toFixed(2));
  const net         = parseFloat((gross - platformFee).toFixed(2));

  return { gross, platform_fee: platformFee, net, bookings: parseInt(result?.booking_count || 0) };
};

// ─────────────────────────────────────────────────────────────
// ADMIN: create a payout record
// ─────────────────────────────────────────────────────────────
const createPayout = async ({
  organizer_id, event_id = null, amount, payment_method, reference_id, notes, adminId,
}) => {
  const platform_fee = parseFloat((amount * PLATFORM_FEE_RATE).toFixed(2));
  const net_amount   = parseFloat((amount - platform_fee).toFixed(2));

  const payout = await Payout.create({
    organizer_id,
    event_id,
    amount,
    platform_fee,
    net_amount,
    payment_method,
    reference_id,
    notes,
    initiated_by: adminId,
    status: "pending",
  });
  return payout;
};

// ─────────────────────────────────────────────────────────────
// ADMIN: update payout status (processing → paid / failed)
// ─────────────────────────────────────────────────────────────
const updatePayoutStatus = async (payoutId, status, reference_id = null, adminId) => {
  const payout = await Payout.findByPk(payoutId);
  if (!payout) return null;

  const updates = { status, initiated_by: adminId };
  if (reference_id) updates.reference_id = reference_id;
  if (status === "paid") updates.paid_at = new Date();

  await payout.update(updates);
  return payout;
};

// ─────────────────────────────────────────────────────────────
// ADMIN: list all payouts (optionally filtered by organizer / status)
// ─────────────────────────────────────────────────────────────
const getAllPayouts = async ({ organizerId, status, page = 1, limit = 20 } = {}) => {
  const where = {};
  if (organizerId) where.organizer_id = organizerId;
  if (status)      where.status       = status;

  const offset = (page - 1) * limit;

  const { count, rows } = await Payout.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "Organizer",
        attributes: ["id", "name", "email"],
        include: [{ model: OrganizerProfile, attributes: ["business_name"] }],
      },
      { model: Event, attributes: ["id", "title", "event_date"] },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  return { total: count, pages: Math.ceil(count / limit), page, payouts: rows };
};

// ─────────────────────────────────────────────────────────────
// ORGANIZER: view own payouts
// ─────────────────────────────────────────────────────────────
const getOrganizerPayouts = async (organizerId) => {
  return Payout.findAll({
    where: { organizer_id: organizerId },
    include: [{ model: Event, attributes: ["id", "title", "event_date"] }],
    order: [["created_at", "DESC"]],
  });
};

// ─────────────────────────────────────────────────────────────
// ORGANIZER: payout summary totals
// ─────────────────────────────────────────────────────────────
const getOrganizerPayoutSummary = async (organizerId) => {
  const result = await Payout.findOne({
    where: { organizer_id: organizerId },
    attributes: [
      [sequelize.fn("SUM", sequelize.col("net_amount")),                   "total_paid"],
      [sequelize.fn("SUM", sequelize.literal("CASE WHEN status='paid' THEN net_amount ELSE 0 END")), "received"],
      [sequelize.fn("SUM", sequelize.literal("CASE WHEN status='pending' THEN net_amount ELSE 0 END")), "pending"],
      [sequelize.fn("COUNT", sequelize.col("id")),                          "count"],
    ],
    raw: true,
  });

  return {
    total_paid: parseFloat(result?.total_paid || 0),
    received:   parseFloat(result?.received   || 0),
    pending:    parseFloat(result?.pending    || 0),
    count:      parseInt(result?.count        || 0),
  };
};

module.exports = {
  calculateSettlement,
  createPayout,
  updatePayoutStatus,
  getAllPayouts,
  getOrganizerPayouts,
  getOrganizerPayoutSummary,
};
