console.log("APP.JS LOADED");

require("dotenv").config();
require("./models");

const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const eventRoutes = require("./routes/event.routes");
const bookingRoutes = require("./routes/booking.routes");
const revenueRoutes = require("./routes/revenue.routes");

const app = express();


// =============================
// CORS
// =============================
app.use(
  cors({
    origin: true, // works for localhost + ALB
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());


// =============================
// HEALTH CHECK
// =============================
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});


// =============================
// Disable Cache
// =============================
app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});


// =============================
// API ROUTES
// =============================
app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/bookings", bookingRoutes);
app.use("/revenue", revenueRoutes);


// =====================================================
// SERVE FRONTEND STATIC FILES (IMPORTANT FIX)
// =====================================================

const frontendPath = path.join(__dirname, "../../frontend");

// Serve HTML + JS + CSS automatically
app.use(express.static(frontendPath));


// =============================
// PAGE ROUTES
// =============================

// Home Page
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});


// USER EVENTS PAGE
app.get("/events-page", (req, res) => {
  res.sendFile(path.join(frontendPath, "events.html"));
});


// USER BOOKINGS
app.get("/my-bookings", (req, res) => {
  res.sendFile(path.join(frontendPath, "my-bookings.html"));
});


// ADMIN DASHBOARD
app.get("/admin", (req, res) => {
  res.sendFile(
    path.join(frontendPath, "admin-dashboard.html")
  );
});


// ADMIN REVENUE
app.get("/admin-revenue", (req, res) => {
  res.sendFile(
    path.join(frontendPath, "admin-revenue.html")
  );
});


// =============================
// DEBUG ROUTE
// =============================
app.get("/debug-admin", (req, res) => {
  res.send("ADMIN ROUTE EXISTS");
});


// =============================
// 404 HANDLER
// =============================
app.use((req, res) => {

  console.log("404 Requested URL:", req.originalUrl);

  res.status(404).json({
    error: "Route not found",
  });
});


// =============================
// GLOBAL ERROR HANDLER
// =============================
app.use((err, _req, res, _next) => {

  console.error("GLOBAL ERROR:", err.message);

  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
  });

});

module.exports = app;