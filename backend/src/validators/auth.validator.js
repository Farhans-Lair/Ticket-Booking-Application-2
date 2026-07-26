const { body } = require("express-validator");

const signupRequestValidator = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[0-9!@#$%^&*()_+=\-{}\[\]|:;<>,.?/~`]/)
    .withMessage("Password must contain at least one number or symbol"),
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

const organizerSignupRequestValidator = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[0-9!@#$%^&*()_+=\-{}\[\]|:;<>,.?/~`]/)
    .withMessage("Password must contain at least one number or symbol"),
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
