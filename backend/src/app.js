console.log("APP.JS LOADED");

require("dotenv").config();
require("./models"); // 👈 Initialize DB Models

const express = require("express");
const cors = require("cors");
const path = require("path");

const authenticate = require("./middleware/auth.middleware");
const authorizeAdmin = require("./middleware/authorizeadmin");

const authRoutes = require("./routes/auth.routes");
const eventRoutes = require("./routes/event.routes");
const bookingRoutes = require("./routes/booking.routes");
const revenueRoutes = require("./routes/revenue.routes");
const adminRoutes = require("./routes/admin.routes");


const app = express();

/* =====================================================
   ✅ CORS CONFIG (Environment-safe)
===================================================== */

app.use(
  cors({
    origin: "http://localhost:3000",
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
   📦 API Routes
===================================================== */

app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/bookings", bookingRoutes);
app.use("/", revenueRoutes);

/* =====================================================
   🎨 Static Assets (ONLY JS & CSS)
   ⚠ DO NOT expose full frontend folder
===================================================== */

app.use(
  "/js",
  express.static(path.join(__dirname, "../frontend/js"))
);

app.use(
  "/css",
  express.static(path.join(__dirname, "../frontend/css"))
);

app.use("/",adminRoutes);


/* =====================================================
   🔐 Protected HTML Pages (ADMIN ONLY)
===================================================== */

// Admin Dashboard

/*app.get("/admin", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../frontend/admin-dashboard.html")
  );
});

// Admin Revenue Page
app.get("/admin-revenue", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../frontend/admin-revenue.html")
  );
});
*/

/* =====================================================
   👤 USER PROTECTED HTML PAGE
===================================================== */

app.get("/my-bookings", authenticate, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../frontend/my-bookings.html")
  );
});

// Debug Route
app.get("/debug-admin", (req, res) => {
  res.send("ADMIN ROUTE EXISTS");
});

/* =====================================================
   ❌ 404 Handler
===================================================== */

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

/* =====================================================
   🔥 Global Error Handler
===================================================== */

app.use((err, _req, res, _next) => {
  console.error("GLOBAL ERROR:", err.message);

  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
  });
});

module.exports = app;