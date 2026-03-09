require("dotenv").config();
require("./models"); // 👈 Initialize DB Models

const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");


const authRoutes = require("./routes/auth.routes");
const eventRoutes = require("./routes/event.routes");
const bookingRoutes = require("./routes/booking.routes");
const revenueRoutes = require("./routes/revenue.routes");
const adminRoutes = require("./routes/admin.routes");
const paymentRoutes = require("./routes/payment.routes");
const seatRoutes    = require("./routes/seat.routes");
const errorHandler = require("./middleware/error.middleware");


const app = express();

/* =====================================================
   ✅ CORS CONFIG (Environment-safe)
===================================================== */

app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* =====================================================
   ✅ JSON Parsing
===================================================== */

app.use(express.json({ limit: '25mb' }));

/* =====================================================
   🏥 Health Check (ALB / CI)
===================================================== */

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/* =====================================================
   🔒 RATE LIMITERS
===================================================== */

// 1. Global limiter — all routes
//    100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,   // sends RateLimit-* headers to client
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// 2. Auth limiter — stricter for login/register/OTP
//    10 attempts per 15 minutes per IP (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});

// 3. Payment limiter — prevent payment endpoint abuse
//    20 requests per 15 minutes per IP
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many payment requests. Please slow down." },
});

/* =====================================================
   🔒 Prevent Browser Caching of Protected Pages
===================================================== */

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  next();
});

/* =====================================================
   Static Assets (JS & CSS only)
===================================================== */
app.use("/js", express.static(path.join(__dirname, "../../frontend/js")));
app.use("/css", express.static(path.join(__dirname, "../../frontend/css")));

/* =====================================================
   API Routes  ← JWT auth enforced HERE (in the routes)
===================================================== */
app.use("/auth",authLimiter, authRoutes);
app.use("/events",globalLimiter, eventRoutes);
app.use("/bookings",globalLimiter, bookingRoutes);
app.use("/payments",paymentLimiter, paymentRoutes);
app.use("/seats",globalLimiter ,seatRoutes);
app.use("/api", globalLimiter, revenueRoutes);

/* =====================================================
   HTML Page Routes  ← NO JWT middleware here.
   Auth is handled client-side via localStorage checks
   in admin-auth.js, events.js, my-bookings.js etc.
===================================================== */

// Login / Register page (public)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/index.html"));
});

// Events page (client-side auth check in events.js)
app.get("/events-page", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/events.html"));
});

// My Bookings page (client-side auth check in my-bookings.js)
app.get("/my-bookings", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/my-bookings.html"));
});

// Payment page (client-side auth check in payment.js)
app.get("/payment", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/payment.html"));
});

app.get("/seat-selection", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/seat-selection.html"))
});

app.use("/admin",adminRoutes);

/* =====================================================
   ❌ 404 Handler
===================================================== */

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

/* =====================================================
   Global Error Handler (uses error.middleware.js)
===================================================== */
app.use(errorHandler);

module.exports = app;