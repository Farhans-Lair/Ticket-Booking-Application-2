require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

/**
 * ✅ UNIVERSAL CORS (Express 5 safe)
 */
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

/**
 * ✅ IMPORTANT:
 * Express 5 DOES NOT LIKE app.options("*")
 * This handles preflight safely
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
const authRoutes = require("./routes/auth.routes");
const eventRoutes = require("./routes/event.routes");
const bookingRoutes = require("./routes/booking.routes");

app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/bookings", bookingRoutes);

/**
 * ✅ CI SAFE error handler
 */
app.use((err, _req, res, _next) => {
  console.error("GLOBAL ERROR:", err.message);
  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error"
  });
});

module.exports = app;
