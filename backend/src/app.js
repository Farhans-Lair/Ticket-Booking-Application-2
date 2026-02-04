require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

/**
 * ✅ UNIVERSAL CORS CONFIG
 * - Works in browser
 * - Works in CI/CD
 * - Works behind ALB
 * - No wildcard crashes
 */
app.use(cors({
  origin: true, // reflect request origin safely
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

/**
 * ✅ REQUIRED for Authorization header
 * Browsers send OPTIONS before GET/POST
 */
app.options("*", cors());

/**
 * ✅ JSON parsing
 */
app.use(express.json());

/**
 * ✅ Health check (ALB + CI)
 */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK" });
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
 * ✅ CI/CD SAFE ERROR HANDLER
 * Prevents pipeline crashes
 */
app.use((err, _req, res, _next) => {
  console.error("GLOBAL ERROR:", err.message);
  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error"
  });
});

module.exports = app;
