const authService = require("../services/auth.services");
HEAD
const jwt         = require("jsonwebtoken");
const logger      = require("../config/logger");


// ─── SIGNUP ───────────────────────────────────────────────────────────────────

const signupRequest = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    await authService.initiateSignup(name, email, password);
    logger.info("Signup OTP sent successfully", { email });
    res.status(200).json({
      message: "Verification code sent to your email. Please enter it to complete registration.",
    });
  } catch (err) {
    logger.error("Signup OTP request failed", { email: req.body?.email, error: err.message });
    next(err);
  }
};

const signupVerify = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    logger.info("Signup OTP verification attempted", { email });
    await authService.completeSignup(email, otp);
    logger.info("User registered successfully", { email });
    res.status(201).json({ message: "Registration successful. You can now log in." });
  } catch (err) {
    logger.error("Signup OTP verification failed", { email: req.body?.email, error: err.message });
    next(err);
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────

const loginRequest = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    logger.info("Login OTP requested", { email });
    await authService.initiateLogin(email, password);
    logger.info("Login OTP sent successfully", { email });
    res.status(200).json({
      message: "Verification code sent to your email. Please enter it to complete login.",
    });
  } catch (err) {
    logger.error("Login OTP request failed", { email: req.body?.email, error: err.message });
    next(err);
  }
};

const loginVerify = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    logger.info("Login OTP verification attempted", { email });
    const { userId, role } = await authService.completeLogin(email, otp);

    const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const isSecure = process.env.COOKIE_SECURE === "true";

    res.cookie("token", token, {
      httpOnly: true,
      secure:   isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 1000,
    });

    logger.info("User logged in successfully", { userId, role, email });
    res.json({ role, userId, token });
  } catch (err) {
    logger.error("Login OTP verification failed", { email: req.body?.email, error: err.message });
    next(err);
  }
};

const logout = (req, res) => {
  const isSecure = process.env.COOKIE_SECURE === "true";
  res.clearCookie("token", { httpOnly: true, secure: isSecure, sameSite: "lax", path: "/" });
  logger.info("User logged out", { userId: req.user?.id });
  res.json({ message: "Logged out successfully" });
};

const me = (req, res) => {
  res.json({ userId: req.user.id, role: req.user.role });
};

// ─── ORGANIZER SIGNUP (NEW) ───────────────────────────────────────────────────

/**
 * POST /auth/organizer-signup-request
 * Accepts organizer registration details + sends OTP.
 * Nothing is written to DB yet.
 */
const organizerSignupRequest = async (req, res, next) => {
  try {
    const { name, email, password, business_name, contact_phone, gst_number, address } = req.body;

    await authService.initiateOrganizerSignup(name, email, password, {
      business_name,
      contact_phone,
      gst_number,
      address,
    });

    logger.info("Organizer signup OTP sent", { email });
    res.status(200).json({
      message: "Verification code sent to your email. Please enter it to complete organizer registration.",
    });
  } catch (err) {
    logger.error("Organizer signup OTP request failed", { email: req.body?.email, error: err.message });
    next(err);
  }
};

/**
 * POST /auth/organizer-signup-verify
 * Verifies OTP, creates user (role=organizer) + organizer_profile (status=pending).
 * The organizer must wait for admin approval before accessing the dashboard.
 */
const organizerSignupVerify = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    logger.info("Organizer signup OTP verification attempted", { email });

    const { user, profile } = await authService.completeOrganizerSignup(email, otp);

    logger.info("Organizer registered — pending approval", {
      userId:    user.id,
      profileId: profile.id,
      email,
    });

    res.status(201).json({
      message: "Registration successful. Your organizer account is pending admin approval. You will receive an email once reviewed.",
      status:  "pending",
    });
  } catch (err) {
    logger.error("Organizer signup OTP verification failed", { email: req.body?.email, error: err.message });
    next(err);
=======
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models");   // 🔥 MUST be here

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    await authService.registerUser(name, email, password);

    res.status(201).json({
      message: "User registered successfully",
    });
  } catch (err) {
    next (err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token,role: user.role });
  } catch (err) {
    next (err);
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
  }
};

module.exports = {
<<<<<<< HEAD
  signupRequest,
  signupVerify,
  loginRequest,
  loginVerify,
  logout,
  me,
  organizerSignupRequest,
  organizerSignupVerify,
=======
  register,
  login,
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
};
