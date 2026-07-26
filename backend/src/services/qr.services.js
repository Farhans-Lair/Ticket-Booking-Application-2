const jwt    = require("jsonwebtoken");
const QRCode = require("qrcode");

const SECRET        = process.env.QR_JWT_SECRET || process.env.JWT_SECRET || "changeme-replace-in-production-32chars";
const EXPIRY_DAYS   = 365;

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

const generateQrPng = async (token) => {
  try {
    return await QRCode.toBuffer(token, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 300,
    });
  } catch (err) {
    throw new Error(`QR PNG generation failed: ${err.message}`);
  }
};

const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};

module.exports = { generateToken, generateQrDataUri, generateQrPng, verifyToken };
