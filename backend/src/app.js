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
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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


// 🔐 Protected admin page
app.get("/admin", authenticate, authorizeAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/admin-events.html"));
});

// Serve only public pages
app.use("/public", express.static(path.join(__dirname, "../frontend")));


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
