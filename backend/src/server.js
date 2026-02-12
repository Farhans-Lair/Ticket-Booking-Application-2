require("dotenv").config();

const path = require("path");
const express = require("express");


const app = require("./app");
const sequelize = require("./config/database");

const authenticate = require("./middleware/auth.middleware");
const authorizeAdmin = require("./middleware/authorizeadmin");

const PORT = process.env.PORT || 3000;

// Serve ONLY public assets
app.use(
  "/",
  express.static(path.join(__dirname, "../frontend/public"))
);

/* =====================================================
   🔐 PROTECTED HTML ROUTES
   ===================================================== */

// Admin dashboard (ONLY admin)
app.get(
  "/admin",
  authenticate,
  authorizeAdmin,
  (req, res) => {
    res.sendFile(
      path.join(__dirname, "../frontend/admin-events.html")
    );
  }
);

// Create event page (ONLY admin)
app.get(
  "/create-event",
  authenticate,
  authorizeAdmin,
  (req, res) => {
    res.sendFile(
      path.join(__dirname, "../frontend/create-event.html")
    );
  }
);

/* =====================================================
   🏥 Health Check (for ALB)
   ===================================================== */

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

/* =====================================================
   🚀 START SERVER
   ===================================================== */

// 🔹 Start server immediately
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

/* =====================================================
   🗄 DATABASE INIT
   ===================================================== */


// 🔹 Initialize DB asynchronously
(async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");

    await sequelize.sync();
    console.log("Models synchronized successfully");
  } catch (err) {
    console.error("Database initialization failed:", err.message);
    // ❗ DO NOT exit — keep server alive for ALB health checks
  }
})();
