/**
 * In-memory OTP store with automatic expiry.
 * Each entry: { otp, purpose, payload, expiresAt }
 *
 * purpose: "signup" | "login"
 * payload (signup): { name, passwordHash }
 * payload (login):  { userId, role }
 */

const crypto = require("crypto");

const otpStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generate a 6-digit numeric OTP and store it against the email.
 * Any previous OTP for the same email is overwritten.
 */
function generateOTP(email, purpose, payload) {
  const otp = crypto.randomInt(100000, 999999).toString();

  otpStore.set(email, {
    otp,
    purpose,
    payload,
    expiresAt: Date.now() + OTP_TTL_MS,
  });

  // Auto-clean after TTL
  setTimeout(() => {
    const entry = otpStore.get(email);
    if (entry && entry.otp === otp) {
      otpStore.delete(email);
    }
  }, OTP_TTL_MS);

  return otp;
}

/**
 * Verify an OTP for a given email and purpose.
 * Returns the stored payload on success, throws on failure.
 */
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

  // Consume the OTP (one-time use)
  otpStore.delete(email);
  return entry.payload;
}

module.exports = { generateOTP, verifyOTP };
