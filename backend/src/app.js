const express = require("express");
const cors = require("cors");
const sequelize = require("./config/database");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

//Test DB Connection
sequelize.authenticate()
  .then(() => console.log("Database connected successfully"))
  .catch(err => console.error("Database connection failed:", err));


// Health check (VERY IMPORTANT for AWS)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Temporary root route
app.get("/", (req, res) => {
  res.send("Ticket Booking Platform API is running");
});

module.exports = app;
