
const crypto = require("crypto");

const otpStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;

function generateOTP(email, purpose, payload) {
  const otp = crypto.randomInt(100000, 999999).toString();

  otpStore.set(email, {
    otp,
    purpose,
    payload,
    expiresAt: Date.now() + OTP_TTL_MS,
  });

  setTimeout(() => {
    const entry = otpStore.get(email);
    if (entry && entry.otp === otp) {
      otpStore.delete(email);
    }
  }, OTP_TTL_MS);

  return otp;
}

function verifyOTP(email, otp, purpose) {
  const entry = otpStore.get(email);

  if (!entry) {
    throw new Error("OTP not found. Please request a new one.");
  }

  if (entry.purpose !== purpose) {
    throw new Error("Invalid OTP purpose.");
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email);
    throw new Error("OTP has expired. Please request a new one.");
  }

  if (entry.otp !== otp) {
    throw new Error("Invalid OTP. Please try again.");
  }

  otpStore.delete(email);
  return entry.payload;
}

module.exports = { generateOTP, verifyOTP };
