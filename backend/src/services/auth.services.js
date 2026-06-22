const bcrypt = require("bcrypt");
<<<<<<< HEAD
const { User, OrganizerProfile } = require("../models");
const { generateOTP, verifyOTP } = require("./otp.services");
const { sendOTPEmail }           = require("./email.services");

// ─── USER SIGNUP FLOW (unchanged) ─────────────────────────────────────────────

/**
 * Step 1 – Validate signup details, hash password, and send OTP.
 */
const initiateSignup = async (name, email, password) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) throw new Error("An account with this email already exists.");

  const passwordHash = await bcrypt.hash(password, 10);
  const otp = generateOTP(email, "signup", { name, passwordHash });
  await sendOTPEmail(email, otp, "signup");
};

/**
 * Step 2 – Verify OTP and create the user account.
 */
const completeSignup = async (email, otp) => {
  const { name, passwordHash } = verifyOTP(email, otp, "signup");

  const existing = await User.findOne({ where: { email } });
  if (existing) throw new Error("An account with this email already exists.");

  return User.create({ name, email, password_hash: passwordHash });
};

// ─── LOGIN FLOW (unchanged) ───────────────────────────────────────────────────

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
 * Step 2 – Verify OTP and return user payload for JWT signing.
 */
const completeLogin = async (email, otp) => {
  return verifyOTP(email, otp, "login"); // { userId, role }
};

// ─── ORGANIZER SIGNUP FLOW (NEW) ─────────────────────────────────────────────

/**
 * Step 1 – Validate organizer details, hash password, stash everything in
 *           the OTP payload, and send OTP.
 *
 * Nothing is written to the DB at this stage — the account + profile are
 * created atomically in step 2 after OTP verification.
 */
const initiateOrganizerSignup = async (
  name,
  email,
  password,
  { business_name, contact_phone, gst_number, address }
) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) throw new Error("An account with this email already exists.");

  const passwordHash = await bcrypt.hash(password, 10);

  const otp = generateOTP(email, "organizer-signup", {
    name,
    passwordHash,
    business_name,
    contact_phone: contact_phone || null,
    gst_number:    gst_number    || null,
    address:       address       || null,
  });

  await sendOTPEmail(email, otp, "signup");
};

/**
 * Step 2 – Verify OTP, create the user with role='organizer', and create
 *           the organizer profile with status='pending'.
 *
 * Returns { user, profile } — the controller sends a 201 response from these.
 */
const completeOrganizerSignup = async (email, otp) => {
  const {
    name,
    passwordHash,
    business_name,
    contact_phone,
    gst_number,
    address,
  } = verifyOTP(email, otp, "organizer-signup");

  const existing = await User.findOne({ where: { email } });
  if (existing) throw new Error("An account with this email already exists.");

  // Create user with role='organizer'
  const user = await User.create({
    name,
    email,
    password_hash: passwordHash,
    role: "organizer",
  });

  // Create organizer profile with status='pending' (admin must approve)
  const profile = await OrganizerProfile.create({
    user_id:       user.id,
    business_name,
    contact_phone,
    gst_number,
    address,
    status:        "pending",
  });

  return { user, profile };
};

module.exports = {
  initiateSignup,
  completeSignup,
  initiateLogin,
  completeLogin,
  initiateOrganizerSignup,
  completeOrganizerSignup,
=======
const jwt = require("jsonwebtoken");
const { User } = require("../models");

const registerUser = async (name, email, password) => {
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error("User already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return User.create({
    name,
    email,
    password_hash: passwordHash,
  });
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isValidPassword = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }

console.log("JWT SECRET (SIGN):", process.env.JWT_SECRET);

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role},
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return token;
};

module.exports = {
  registerUser,
  loginUser,
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
};
