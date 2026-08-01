const { OrganizerProfile } = require("../models");

const authorizeOrganizer = async (req, res, next) => {
  try {

    if (req.user.role !== "organizer" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Organizer access required." });
    }

    if (req.user.role === "admin") return next();

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

    req.organizerProfile = profile;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authorizeOrganizer;
