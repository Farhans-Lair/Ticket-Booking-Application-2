const express = require("express");
<<<<<<< HEAD
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

// ─── User signup ──────────────────────────────────────────────────────────────
router.post("/signup-request", ...signupRequestValidator,  validate, authController.signupRequest);
router.post("/signup-verify",  ...signupVerifyValidator,   validate, authController.signupVerify);

// ─── Login ────────────────────────────────────────────────────────────────────
router.post("/login-request",  ...loginRequestValidator,   validate, authController.loginRequest);
router.post("/login-verify",   ...loginVerifyValidator,    validate, authController.loginVerify);

// ─── Organizer signup ─────────────────────────────────────────────────────────
// Step 1: submit business details + send OTP
router.post(
  "/organizer-signup-request",
  ...organizerSignupRequestValidator,   // ← spread so Express sees individual middleware functions
  validate,
  authController.organizerSignupRequest
);
// Step 2: verify OTP → creates user (role=organizer) + profile (status=pending)
router.post(
  "/organizer-signup-verify",
  ...organizerSignupVerifyValidator,    // ← same fix
  validate,
  authController.organizerSignupVerify
);

// ─── Session ──────────────────────────────────────────────────────────────────
router.post("/logout", authenticate, authController.logout);
router.get("/me",      authenticate, authController.me);

module.exports = router;
=======
const router = express.Router();
const authController = require("../controllers/auth.controllers");

const validate = require("../middleware/validate.middleware");

const {
  registerValidator,
  loginValidator,
} = require("../validators/auth.validator");

router.post("/register", authController.register);
router.post("/login", authController.login);

module.exports = router;

>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
