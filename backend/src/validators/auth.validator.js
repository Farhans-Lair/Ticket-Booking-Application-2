const { body } = require("express-validator");

// ─── User signup ──────────────────────────────────────────────────────────────

const signupRequestValidator = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

const signupVerifyValidator = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("OTP must be a 6-digit number"),
];

// ─── Login ────────────────────────────────────────────────────────────────────

const loginRequestValidator = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const loginVerifyValidator = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("OTP must be a 6-digit number"),
];

// ─── Organizer signup ─────────────────────────────────────────────────────────
// Step 1: collect all business details upfront, then send OTP

const organizerSignupRequestValidator = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("business_name")
    .notEmpty()
    .withMessage("Business / venue name is required"),
  body("contact_phone")
    .optional()
    .isMobilePhone()
    .withMessage("Valid phone number is required"),
  body("gst_number")
    .optional()
    .isLength({ max: 20 })
    .withMessage("GST number must be 20 characters or fewer"),
  body("address")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Address must be 500 characters or fewer"),
];

// Step 2: same shape as regular signup-verify — just email + OTP
const organizerSignupVerifyValidator = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("OTP must be a 6-digit number"),
];

module.exports = {
  signupRequestValidator,
  signupVerifyValidator,
  loginRequestValidator,
  loginVerifyValidator,
  organizerSignupRequestValidator,
  organizerSignupVerifyValidator,

};
