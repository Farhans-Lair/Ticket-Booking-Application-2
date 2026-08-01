const { OrganizerProfile, User, Event, Booking } = require("../models");
const { getEffectiveRevenue } = require("./cancellation.services");

const getProfile = async (userId) => {
  return OrganizerProfile.findOne({
    where: { user_id: userId },
    include: [{ model: User, attributes: ["id", "name", "email"] }],
  });
};

const updateProfile = async (userId, data) => {
  const profile = await OrganizerProfile.findOne({ where: { user_id: userId } });
  if (!profile) throw new Error("Organizer profile not found.");

  const allowed = ["business_name", "contact_phone", "gst_number", "address"];
  allowed.forEach((field) => {
    if (data[field] !== undefined) profile[field] = data[field];
  });

  await profile.save();
  return profile;
};

const getOrganizerEvents = async (organizerId) => {
  return Event.findAll({
    where: { organizer_id: organizerId },
    order: [["event_date", "ASC"]],
  });
};

const getOrganizerRevenue = async (organizerId) => {
  const events = await Event.findAll({
    where: { organizer_id: organizerId },
    include: [
      {
        model: Booking,
        where: { payment_status: "paid" },
        required: false,
        attributes: [
          "id", "tickets_booked", "ticket_amount", "convenience_fee",
          "gst_amount", "total_paid", "payment_status", "cancellation_status",
          "refund_amount", "cancellation_fee", "cancellation_fee_gst",
          "applied_tier_hours", "booking_date",
        ],
      },
    ],
  });

  return events
    .filter(e => e.Bookings && e.Bookings.length > 0)
    .map(event => {
      const enrichedBookings = event.Bookings.map(b => {
        const eff = getEffectiveRevenue(b);
        return { ...b.toJSON(), ...eff };
      });

      const eventTotals = enrichedBookings.reduce((acc, b) => {
        acc.effective_ticket       += b.effective_ticket;
        acc.effective_conv         += b.effective_conv;
        acc.effective_gst          += b.effective_gst;
        acc.effective_cancellation += b.effective_cancellation;
        acc.effective_total        += b.effective_total;
        acc.tickets_sold           += b.tickets_booked;
        return acc;
      }, { effective_ticket: 0, effective_conv: 0, effective_gst: 0, effective_cancellation: 0, effective_total: 0, tickets_sold: 0 });

      return { ...event.toJSON(), Bookings: enrichedBookings, eventTotals };
    });
};

const getOrganizerStats = async (organizerId) => {
  const events = await Event.findAll({
    where: { organizer_id: organizerId },
    include: [
      {
        model: Booking,
        where: { payment_status: "paid" },
        required: false,
        attributes: [
          "tickets_booked", "ticket_amount", "convenience_fee", "gst_amount",
          "total_paid", "cancellation_status", "refund_amount",
          "cancellation_fee", "cancellation_fee_gst", "applied_tier_hours",
        ],
      },
    ],
  });

  let totalRevenue  = 0;
  let totalTickets  = 0;
  let totalBookings = 0;

  events.forEach(event => {
    (event.Bookings || []).forEach(b => {
      const eff = getEffectiveRevenue(b);
      totalRevenue  += eff.effective_total;
      totalTickets  += b.tickets_booked;
      totalBookings += 1;
    });
  });

  return {
    totalEvents:      events.length,
    totalBookings,
    totalTicketsSold: totalTickets,
    totalRevenue:     parseFloat(totalRevenue.toFixed(2)),
  };
};

const getEventAttendees = async (eventId, organizerId) => {
  const event = await Event.findOne({
    where: { id: eventId, organizer_id: organizerId },
  });
  if (!event) return null;

  const bookings = await Booking.findAll({
    where: { event_id: eventId, payment_status: "paid" },
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"],
      },
    ],
    order: [["booking_date", "DESC"]],
  });

  return { event, bookings };
};

const getAllOrganizers = async (status) => {
  const where = status ? { status } : {};
  return OrganizerProfile.findAll({
    where,
    include: [{ model: User, attributes: ["id", "name", "email", "created_at"] }],
    order: [["created_at", "DESC"]],
  });
};

const approveOrganizer = async (profileId) => {
  const profile = await OrganizerProfile.findByPk(profileId);
  if (!profile) return null;

  profile.status           = "approved";
  profile.rejection_reason = null;
  await profile.save();
  return profile;
};

const rejectOrganizer = async (profileId, reason) => {
  const profile = await OrganizerProfile.findByPk(profileId);
  if (!profile) return null;

  profile.status           = "rejected";
  profile.rejection_reason = reason || null;
  await profile.save();
  return profile;
};

const deleteOrganizer = async (profileId) => {
  const profile = await OrganizerProfile.findByPk(profileId, {
    include: [{ model: User, attributes: ["id"] }],
  });
  if (!profile) return null;

  await User.destroy({ where: { id: profile.user_id } });
  return true;
};

module.exports = {
  getProfile,
  updateProfile,
  getOrganizerEvents,
  getOrganizerRevenue,
  getOrganizerStats,
  getEventAttendees,
  getAllOrganizers,
  approveOrganizer,
  rejectOrganizer,
  deleteOrganizer,
};
