const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { User, OrganizerProfile, RefreshToken } = require("../models");
const { generateOTP, verifyOTP } = require("./otp.services");
const { sendOTPEmail }           = require("./email.services");

const initiateSignup = async (name, email, password) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) throw new Error("An account with this email already exists.");
  const passwordHash = await bcrypt.hash(password, 10);
  const otp = generateOTP(email, "signup", { name, passwordHash });
  await sendOTPEmail(email, otp, "signup");
};

const completeSignup = async (email, otp) => {
  const { name, passwordHash } = verifyOTP(email, otp, "signup");
  const existing = await User.findOne({ where: { email } });
  if (existing) throw new Error("An account with this email already exists.");
  return User.create({ name, email, password_hash: passwordHash });
};

const initiateLogin = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new Error("Invalid credentials");
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error("Invalid credentials");
  const otp = generateOTP(email, "login", { userId: user.id, role: user.role });
  await sendOTPEmail(email, otp, "login");
};

const completeLogin = async (email, otp) => verifyOTP(email, otp, "login");

const initiateOrganizerSignup = async (name, email, password,
  { business_name, contact_phone, gst_number, address }
) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) throw new Error("An account with this email already exists.");
  const passwordHash = await bcrypt.hash(password, 10);
  const otp = generateOTP(email, "organizer-signup", {
    name, passwordHash, business_name,
    contact_phone: contact_phone || null,
    gst_number:    gst_number    || null,
    address:       address       || null,
  });
  await sendOTPEmail(email, otp, "signup");
};

const completeOrganizerSignup = async (email, otp) => {
  const { name, passwordHash, business_name, contact_phone, gst_number, address }
    = verifyOTP(email, otp, "organizer-signup");
  const existing = await User.findOne({ where: { email } });
  if (existing) throw new Error("An account with this email already exists.");
  const user = await User.create({ name, email, password_hash: passwordHash, role: "organizer" });
  const profile = await OrganizerProfile.create({
    user_id: user.id, business_name, contact_phone, gst_number, address, status: "pending",
  });
  return { user, profile };
};

const REFRESH_TTL_DAYS = 7;

const _hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const saveRefreshToken = async (userId, rawToken) => {
  const tokenHash = _hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.destroy({ where: { user_id: userId } });
  await RefreshToken.create({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt });
};

const rotateRefreshToken = async (rawToken) => {
  const tokenHash = _hashToken(rawToken);
  const record = await RefreshToken.findOne({ where: { token_hash: tokenHash } });

  if (!record) throw new Error("Invalid refresh token. Please log in again.");
  if (new Date() > record.expires_at) {
    await record.destroy();
    throw new Error("Refresh token expired. Please log in again.");
  }

  const user = await User.findByPk(record.user_id);
  if (!user) throw new Error("User not found.");

  await record.destroy();

  return { userId: user.id, role: user.role };
};

const revokeRefreshToken = async (rawToken) => {
  const tokenHash = _hashToken(rawToken);
  await RefreshToken.destroy({ where: { token_hash: tokenHash } });
};

module.exports = {
  initiateSignup, completeSignup,
  initiateLogin, completeLogin,
  initiateOrganizerSignup, completeOrganizerSignup,
  saveRefreshToken, rotateRefreshToken, revokeRefreshToken,
};
