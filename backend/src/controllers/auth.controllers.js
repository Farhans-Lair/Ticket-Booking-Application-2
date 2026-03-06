const authService = require("../services/auth.services");
const jwt = require("jsonwebtoken");

// ─── SIGNUP ───────────────────────────────────────────────────────────────────

/**
 * POST /auth/signup-request
 * Validates details and sends OTP to the provided email.
 */
const signupRequest = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    await authService.initiateSignup(name, email, password);
    res.status(200).json({
      message: "Verification code sent to your email. Please enter it to complete registration.",
    });
  } catch (err) {
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
    await authService.completeSignup(email, otp);
    res.status(201).json({ message: "Registration successful. You can now log in." });
  } catch (err) {
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
    await authService.initiateLogin(email, password);
    res.status(200).json({
      message: "Verification code sent to your email. Please enter it to complete login.",
    });
  } catch (err) {
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
    const { userId, role } = await authService.completeLogin(email, otp);

    const token = jwt.sign(
      { id: userId, role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token, role });
  } catch (err) {
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
