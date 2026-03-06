const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controllers");

const validate = require("../middleware/validate.middleware");

const {signupRequestValidator, signupVerifyValidator,loginRequestValidator, loginVerifyValidator,} = require("../validators/auth.validator");

// ─── Signup with email OTP ────────────────────────────────────────────────────
// Step 1: Validate details + send OTP
router.post("/signup-request", signupRequestValidator, validate, authController.signupRequest);
// Step 2: Verify OTP + create account
router.post("/signup-verify", signupVerifyValidator, validate, authController.signupVerify);

// ─── Login with email OTP (2FA) ───────────────────────────────────────────────
// Step 1: Validate credentials + send OTP
router.post("/login-request", loginRequestValidator, validate, authController.loginRequest);
// Step 2: Verify OTP + return JWT
router.post("/login-verify", loginVerifyValidator, validate, authController.loginVerify);


module.exports = router;

