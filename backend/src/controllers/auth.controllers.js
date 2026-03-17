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

    // ── COOKIE_SECURE controls the Secure flag ────────────────────────────────
    // Set COOKIE_SECURE=true in .env ONLY when HTTPS is enabled.
    // Never tie this to NODE_ENV — the node:alpine Docker image sets
    // NODE_ENV=production by default, which would make cookies Secure
    // even on plain HTTP, causing them to be silently dropped by the browser.
    const isSecure = process.env.COOKIE_SECURE === "true";



    // ── Set HttpOnly cookie — JS cannot read or steal this ──────────────────
    res.cookie("token", token, {
      httpOnly: true,                                   // not accessible via JS
      secure:   isSecure,
      sameSite: "lax",
      path: "/",                               // CSRF protection
      maxAge:   60 * 60 * 1000,                         // 1 hour in ms
    });


    logger.info("User logged in successfully", { userId, role, email });

    // Return token, role, and userId so the frontend can:
    //  • Store the token in sessionStorage (per-tab) and send it as
    //    Authorization: Bearer on every API call — this means each tab
    //    always uses its own token regardless of what the shared cookie holds.
    //  • Store role + userId in sessionStorage for UI routing and cross-tab
    //    logout matching via auth-channel.js.
    //
    // The HttpOnly cookie is kept as a fallback for pages that do not use
    // apiRequest (e.g. direct fetch calls), but apiRequest now prefers the
    // per-tab sessionStorage token via the Authorization header.
    res.json({ role, userId, token });
  } catch (err) {
    logger.error("Login OTP verification failed", { email: req.body?.email, error: err.message });
    next(err);
  }
};

/**
 * POST /auth/logout
 * Clears the HttpOnly auth cookie.
 */
const logout = (req, res) => {
  const isSecure = process.env.COOKIE_SECURE === "true";
  res.clearCookie("token", {
    httpOnly: true,
    secure:   isSecure,
    sameSite: "lax",
    path:     "/"
  });
  logger.info("User logged out", { userId: req.user?.id });
  res.json({ message: "Logged out successfully" });
};

/**
 * GET /auth/me
 * Returns the logged-in user's id and role from the cookie.
 * Used by frontend pages to verify the session is still valid
 * rather than relying solely on localStorage.
 * Returns 401 if cookie is missing or expired.
 */
const me = (req, res) => {
  // req.user is populated by the authenticate middleware
  res.json({ userId: req.user.id, role: req.user.role });
};


module.exports =
 {
  signupRequest,
  signupVerify,
  loginRequest,
  loginVerify,
  logout,
  me,
};
