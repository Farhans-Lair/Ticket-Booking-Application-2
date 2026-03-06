const bcrypt = require("bcrypt");
const { User } = require("../models");
const { generateOTP, verifyOTP } = require("./otp.services");
const { sendOTPEmail } = require("./email.services");

// ─── SIGNUP FLOW ──────────────────────────────────────────────────────────────

/**
 * Step 1 – Validate signup details, hash password, and send OTP.
 * The user record is NOT created yet.
 */
const initiateSignup = async (name, email, password) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const otp = generateOTP(email, "signup", { name, passwordHash });
  await sendOTPEmail(email, otp, "signup");
};

/**
 * Step 2 – Verify the signup OTP and create the user account.
 */
const completeSignup = async (email, otp) => {
  const { name, passwordHash } = verifyOTP(email, otp, "signup");

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  return User.create({ name, email, password_hash: passwordHash });
};

// ─── LOGIN FLOW ───────────────────────────────────────────────────────────────

/**
 * Step 1 – Validate credentials and send OTP.
 */
const initiateLogin = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new Error("Invalid credentials");

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error("Invalid credentials");

  const otp = generateOTP(email, "login", { userId: user.id, role: user.role });
  await sendOTPEmail(email, otp, "login");
};

/**
 * Step 2 – Verify the login OTP and return user payload for JWT signing.
 */
const completeLogin = async (email, otp) => {
  return verifyOTP(email, otp, "login"); // { userId, role }
};

module.exports = 
{
  initiateSignup,
  completeSignup,
  initiateLogin,
  completeLogin,

};
