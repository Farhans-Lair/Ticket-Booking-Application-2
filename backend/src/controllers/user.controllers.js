const { User, Booking, Event } = require("../models");
const bcrypt  = require("bcrypt");
const logger  = require("../config/logger");

// ─────────────────────────────────────────────────────────────
// GET /user/profile  —  return the authenticated user's profile
// ─────────────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "phone", "avatar_url", "bio", "bank_details", "role", "created_at"],
    });
    if (!user) return res.status(404).json({ error: "User not found." });

    // Booking summary counts
    const [total, active, cancelled] = await Promise.all([
      Booking.count({ where: { user_id: req.user.id } }),
      Booking.count({ where: { user_id: req.user.id, cancellation_status: "active", payment_status: "paid" } }),
      Booking.count({ where: { user_id: req.user.id, cancellation_status: "cancelled" } }),
    ]);

    res.json({ ...user.toJSON(), booking_summary: { total, active, cancelled } });
  } catch (err) {
    logger.error("Failed to fetch user profile", { userId: req.user?.id, error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /user/profile  —  update name, phone, bio, avatar_url
// ─────────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, bio, avatar_url, bank_details } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    await user.update({
      name:         name         ?? user.name,
      phone:        phone        ?? user.phone,
      bio:          bio          ?? user.bio,
      avatar_url:   avatar_url   ?? user.avatar_url,
      bank_details: bank_details ?? user.bank_details,
    });

    logger.info("User profile updated", { userId: req.user.id });
    res.json({
      id: user.id, name: user.name, email: user.email,
      phone: user.phone, bio: user.bio, avatar_url: user.avatar_url,
    });
  } catch (err) {
    logger.error("User profile update failed", { userId: req.user?.id, error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /user/profile/password  —  change password
// ─────────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: "current_password and new_password are required." });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters." });
    }

    const user = await User.findByPk(req.user.id);
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: "Current password is incorrect." });

    const hash = await bcrypt.hash(new_password, 12);
    await user.update({ password_hash: hash });

    logger.info("User password changed", { userId: req.user.id });
    res.json({ message: "Password updated successfully." });
  } catch (err) {
    logger.error("Password change failed", { userId: req.user?.id, error: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /user/profile/bookings  —  booking history with event info
// ─────────────────────────────────────────────────────────────
const getBookingHistory = async (req, res, next) => {
  try {
    const bookings = await Booking.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Event,
        attributes: ["id", "title", "event_date", "location", "category", "images"],
      }],
      order: [["booking_date", "DESC"]],
      limit: 50,
    });
    res.json(bookings);
  } catch (err) {
    logger.error("Failed to fetch booking history", { userId: req.user?.id, error: err.message });
    next(err);
  }
};

module.exports = { getProfile, updateProfile, changePassword, getBookingHistory };
