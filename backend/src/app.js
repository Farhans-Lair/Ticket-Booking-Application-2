const express = require("express");
const cors = require("cors");
const sequelize = require("./config/database");

// Import models (THIS is correct)
require("./models");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

 // Authorize Routes
const authRoutes = require("./routes/auth.routes");
app.use("/auth", authRoutes);

//verify routes
const eventRoutes = require("./routes/event.routes");
app.use("/events", eventRoutes);

const bookingRoutes = require("./routes/booking.routes");
app.use("/bookings", bookingRoutes);

//Test DB Connection
sequelize.authenticate()
  .then(() => console.log("Database connected successfully"))
  .catch(err => console.error("Database connection failed:", err));

//models sync
   sequelize.sync()
  .then(() => console.log("Models synchronized"))
  .catch(err => console.error("Model sync failed:", err));
 
// Health
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Health check (VERY IMPORTANT for AWS)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Temporary root route
app.get("/", (req, res) => {
  res.send("Ticket Booking Platform API is running");
});

const errorHandler = require("./middleware/error.middleware");
app.use(errorHandler);

module.exports = app;
