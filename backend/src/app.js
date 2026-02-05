require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

/**
 * ✅ CORS (browser + ALB safe)
 * - Only what we need
 * - No wildcard OPTIONS
 */
app.use(
  cors({
    origin: "http://localhost:3000", // frontend origin
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization"],
  })
);

/**
 * ✅ JSON parsing
 */
app.use(express.json());

/**
 * ✅ Health check (CI + ALB)
 */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * ✅ Routes
 */
const authRoutes = require("./routes/auth.routes");
const eventRoutes = require("./routes/event.routes");
const bookingRoutes = require("./routes/booking.routes");

app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/bookings", bookingRoutes);

/**
 * ✅ CI-safe error handler
 */
app.use((err, _req, res, _next) => {
  console.error("GLOBAL ERROR:", err.message);
  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
  });
});

module.exports = app;
