require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

/**
 * 🔴 CRITICAL: Disable ETag
 * This PREVENTS 304 responses
 */
app.disable("etag");

/**
 * ✅ CORS (safe for browser + CI)
 */
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

/**
 * ✅ Handle preflight
 */
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

/**
 * ✅ Health check (CI + ALB)
 */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK" });
});

/**
 * ✅ Routes
 */
app.use("/auth", require("./routes/auth.routes"));
app.use("/events", require("./routes/event.routes"));
app.use("/bookings", require("./routes/booking.routes"));

/**
 * ✅ Error handler (CI safe)
 */
app.use((err, _req, res, _next) => {
  console.error("GLOBAL ERROR:", err.message);
  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
  });
});

module.exports = app;
