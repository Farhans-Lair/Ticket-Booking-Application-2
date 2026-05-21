/**
 * qr.services.js — Feature 3: QR-code tickets + check-in
 *
 * generateToken(bookingId, userId, eventId)  → signed JWT (HS256)
 * generateQrDataUri(token)                   → Base64 PNG data URI
 * verifyToken(token)                         → decoded payload if valid
 */
const jwt    = require("jsonwebtoken");
const QRCode = require("qrcode");

const SECRET        = process.env.QR_JWT_SECRET || process.env.JWT_SECRET || "changeme-replace-in-production-32chars";
const EXPIRY_DAYS   = 365;

/**
 * Creates a signed JWT for the given booking.
 * Payload: { sub: bookingId, userId, eventId, iat, exp }
 */
const generateToken = (bookingId, userId, eventId) => {
  return jwt.sign(
    { userId, eventId },
    SECRET,
    {
      subject:   String(bookingId),
      expiresIn: `${EXPIRY_DAYS}d`,
    }
  );
};

/**
 * Encodes a JWT as a QR-code PNG and returns it as a Base64 Data URI.
 * Useful for embedding in HTML emails and PDF tickets.
 */
const generateQrDataUri = async (token) => {
  try {
    return await QRCode.toDataURL(token, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 250,
    });
  } catch (err) {
    throw new Error(`QR generation failed: ${err.message}`);
  }
};

/**
 * Verifies the QR JWT and returns the decoded payload.
 * Throws JsonWebTokenError / TokenExpiredError on failure.
 */
const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};

module.exports = { generateToken, generateQrDataUri, verifyToken };
