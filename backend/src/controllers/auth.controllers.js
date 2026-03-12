const authService = require("../services/auth.services");
const jwt = require("jsonwebtoken");
const logger      = require("../config/logger");


// ─── SIGNUP ───────────────────────────────────────────────────────────────────

/**
 * POST /auth/signup-request
 * Validates details and sends OTP to the provided email.
 */
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

/**
 * POST /auth/signup-verify
 * Verifies OTP and creates the user account.
 */
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

/**
 * POST /auth/login-request
 * Validates credentials and sends OTP to the user's email.
 */
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

/**
 * POST /auth/login-verify
 * Verifies OTP and returns a signed JWT.
 */
const loginVerify = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    logger.info("Login OTP verification attempted", { email });
    const { userId, role } = await authService.completeLogin(email, otp);

    const token = jwt.sign(
      { id: userId, role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    logger.info("User logged in successfully", { userId, role, email });

    res.json({ token, role });
  } catch (err) {
    logger.error("Login OTP verification failed", { email: req.body?.email, error: err.message });
    next(err);
  }
};

module.exports =
 {
  signupRequest,
  signupVerify,
  loginRequest,
  loginVerify,

};
