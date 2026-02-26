require("dotenv").config();
require("./models"); // 👈 Initialize DB Models

const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const eventRoutes = require("./routes/event.routes");
const bookingRoutes = require("./routes/booking.routes");
const revenueRoutes = require("./routes/revenue.routes");
const adminRoutes = require("./routes/admin.routes");
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

app.use(express.json());

/* =====================================================
   🏥 Health Check (ALB / CI)
===================================================== */

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
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
app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/bookings", bookingRoutes);
app.use("/api", revenueRoutes);

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