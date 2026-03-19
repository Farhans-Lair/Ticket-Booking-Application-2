const express = require("express");
const router  = express.Router();

const authController = require("../controllers/auth.controllers");
const validate       = require("../middleware/validate.middleware");
const authenticate   = require("../middleware/auth.middleware");

const {
  signupRequestValidator,
  signupVerifyValidator,
  loginRequestValidator,
  loginVerifyValidator,
  organizerSignupRequestValidator,
  organizerSignupVerifyValidator,
} = require("../validators/auth.validator");

// ─── User signup ─────────────────────────────────────────────────────────────
router.post("/signup-request", signupRequestValidator,  validate, authController.signupRequest);
router.post("/signup-verify",  signupVerifyValidator,   validate, authController.signupVerify);

// ─── Login ────────────────────────────────────────────────────────────────────
router.post("/login-request",  loginRequestValidator,   validate, authController.loginRequest);
router.post("/login-verify",   loginVerifyValidator,    validate, authController.loginVerify);

// ─── Organizer signup (NEW) ───────────────────────────────────────────────────
// Step 1: submit business details + send OTP
router.post(
  "/organizer-signup-request",
  organizerSignupRequestValidator,
  validate,
  authController.organizerSignupRequest
);
// Step 2: verify OTP → creates user (role=organizer) + profile (status=pending)
router.post(
  "/organizer-signup-verify",
  organizerSignupVerifyValidator,
  validate,
  authController.organizerSignupVerify
);

// ─── Session ──────────────────────────────────────────────────────────────────
router.post("/logout", authenticate, authController.logout);
router.get("/me",      authenticate, authController.me);

module.exports = router;
