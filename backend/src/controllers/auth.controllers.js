const authService = require("../services/auth.services");
const jwt         = require("jsonwebtoken");
const crypto      = require("crypto");
const logger      = require("../config/logger");

// ── Token helpers ─────────────────────────────────────────────────────────────

const ACCESS_EXPIRY  = "8h";               // #1 — extended from 1h → 8h
const ACCESS_MAX_MS  = 8 * 60 * 60 * 1000;
const REFRESH_EXPIRY = "7d";              // #1 — 7-day sliding refresh
const REFRESH_MAX_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Issue a signed JWT access token.
 */
const _issueAccessToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRY });

/**
 * Issue an opaque refresh token (random 64-byte hex).
 * The token itself carries no claims — it's looked up in the DB on use.
 */
const _issueRefreshToken = () => crypto.randomBytes(64).toString("hex");

/**
 * Set both cookies on the response.
 */
const _setAuthCookies = (res, accessToken, refreshToken) => {
  const secure = process.env.COOKIE_SECURE === "true";

  res.cookie("token", accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path:     "/",
    maxAge:   ACCESS_MAX_MS,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path:     "/auth/refresh",   // only sent to the refresh endpoint
    maxAge:   REFRESH_MAX_MS,
  });
};

// ── User signup ───────────────────────────────────────────────────────────────

const signupRequest = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    await authService.initiateSignup(name, email, password);
    logger.info("Signup OTP sent", { email });
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
    await authService.completeSignup(email, otp);
    logger.info("User registered", { email });
    res.status(201).json({ message: "Registration successful. You can now log in." });
  } catch (err) {
    logger.error("Signup verify failed", { email: req.body?.email, error: err.message });
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────

const loginRequest = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    await authService.initiateLogin(email, password);
    logger.info("Login OTP sent", { email });
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
    const { userId, role } = await authService.completeLogin(email, otp);

    const accessToken  = _issueAccessToken(userId, role);
    const refreshToken = _issueRefreshToken();

    // Store hashed refresh token in DB with expiry
    await authService.saveRefreshToken(userId, refreshToken);

    _setAuthCookies(res, accessToken, refreshToken);

    logger.info("User logged in", { userId, role, email });
    res.json({ userId, role, token: accessToken });
  } catch (err) {
    logger.error("Login verify failed", { email: req.body?.email, error: err.message });
    next(err);
  }
};

// ── Token refresh ─────────────────────────────────────────────────────────────

/**
 * POST /auth/refresh
 * Reads the refreshToken cookie, validates it against the DB,
 * issues a new access token + rotates the refresh token (sliding window).
 */
const refresh = async (req, res, next) => {
  try {
    const incomingRefresh = req.cookies?.refreshToken;
    if (!incomingRefresh) {
      return res.status(401).json({ error: "No refresh token. Please log in again." });
    }

    const { userId, role } = await authService.rotateRefreshToken(incomingRefresh);

    const newAccess  = _issueAccessToken(userId, role);
    const newRefresh = _issueRefreshToken();

    await authService.saveRefreshToken(userId, newRefresh);

    _setAuthCookies(res, newAccess, newRefresh);

    logger.info("Token refreshed", { userId });
    res.json({ token: newAccess });
  } catch (err) {
    logger.error("Token refresh failed", { error: err.message });
    // Clear cookies so the client redirects to login
    res.clearCookie("token");
    res.clearCookie("refreshToken", { path: "/auth/refresh" });
    next(err);
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────

const logout = async (req, res) => {
  const secure = process.env.COOKIE_SECURE === "true";

  // Revoke the refresh token from DB so it can't be reused
  try {
    const rt = req.cookies?.refreshToken;
    if (rt) await authService.revokeRefreshToken(rt);
  } catch (_) { /* non-fatal */ }

  res.clearCookie("token", { httpOnly: true, secure, sameSite: "lax", path: "/" });
  res.clearCookie("refreshToken", { httpOnly: true, secure, sameSite: "lax", path: "/auth/refresh" });

  logger.info("User logged out", { userId: req.user?.id });
  res.json({ message: "Logged out successfully" });
};

// ── Current user ──────────────────────────────────────────────────────────────

const me = (req, res) => res.json({ userId: req.user.id, role: req.user.role });

// ── Organizer signup ──────────────────────────────────────────────────────────

const organizerSignupRequest = async (req, res, next) => {
  try {
    const { name, email, password, business_name, contact_phone, gst_number, address } = req.body;
    await authService.initiateOrganizerSignup(name, email, password,
      { business_name, contact_phone, gst_number, address });
    logger.info("Organizer signup OTP sent", { email });
    res.status(200).json({
      message: "Verification code sent to your email. Please enter it to complete organizer registration.",
    });
  } catch (err) {
    logger.error("Organizer signup OTP failed", { email: req.body?.email, error: err.message });
    next(err);
  }
};

const organizerSignupVerify = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const { user, profile } = await authService.completeOrganizerSignup(email, otp);
    logger.info("Organizer registered — pending approval", { userId: user.id, email });
    res.status(201).json({
      message: "Registration successful. Your organizer account is pending admin approval.",
      status: "pending",
    });
  } catch (err) {
    logger.error("Organizer signup verify failed", { email: req.body?.email, error: err.message });
    next(err);
  }
};

module.exports = {
  signupRequest, signupVerify,
  loginRequest, loginVerify,
  refresh, logout, me,
  organizerSignupRequest, organizerSignupVerify,
};
