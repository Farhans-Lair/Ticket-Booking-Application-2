const { body } = require("express-validator");

// ─── New OTP validators ───────────────────────────────────────────────────────

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


module.exports = {
  signupRequestValidator,
  signupVerifyValidator,
  loginRequestValidator,
  loginVerifyValidator,

};
