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

router.post("/signup-request", ...signupRequestValidator,  validate, authController.signupRequest);
router.post("/signup-verify",  ...signupVerifyValidator,   validate, authController.signupVerify);

router.post("/login-request",  ...loginRequestValidator,   validate, authController.loginRequest);
router.post("/login-verify",   ...loginVerifyValidator,    validate, authController.loginVerify);

router.post(
  "/organizer-signup-request",
  ...organizerSignupRequestValidator,
  validate,
  authController.organizerSignupRequest
);

router.post(
  "/organizer-signup-verify",
  ...organizerSignupVerifyValidator,
  validate,
  authController.organizerSignupVerify
);

router.post("/refresh", authController.refresh);
router.post("/logout",  authenticate, authController.logout);
router.get("/me",       authenticate, authController.me);

module.exports = router;
