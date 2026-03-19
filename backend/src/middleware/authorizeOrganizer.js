const { OrganizerProfile } = require("../models");

/**
 * authorizeOrganizer
 *
 * Guards routes that only an approved organizer (or super-admin) may access.
 *
 * Flow:
 *  1. Role must be 'organizer' or 'admin'.
 *  2. For organizers, their profile must exist and be 'approved'.
 *  3. On success, attaches req.organizerProfile so downstream controllers
 *     don't need to re-query it.
 *  4. Admins bypass the profile check entirely — they can access all
 *     organizer-scoped routes for support / override purposes.
 */
const authorizeOrganizer = async (req, res, next) => {
  try {
    // Must be organizer or admin
    if (req.user.role !== "organizer" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Organizer access required." });
    }

    // Admins bypass the profile approval check
    if (req.user.role === "admin") return next();

    // Fetch organizer profile and check approval status
    const profile = await OrganizerProfile.findOne({
      where: { user_id: req.user.id },
    });

    if (!profile) {
      return res.status(403).json({
        error: "Organizer profile not found. Please contact support.",
      });
    }

    if (profile.status === "pending") {
      return res.status(403).json({
        error: "Your organizer account is pending admin approval. You will receive an email once approved.",
      });
    }

    if (profile.status === "rejected") {
      return res.status(403).json({
        error: `Your organizer application was rejected. Reason: ${profile.rejection_reason || "No reason provided."}`,
      });
    }

    // Attach profile to request — controllers use this to scope queries
    req.organizerProfile = profile;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authorizeOrganizer;
