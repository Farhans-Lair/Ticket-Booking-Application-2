require("dotenv").config();
const express = require("express");
const app = express();

const authRoutes = require("./routes/auth.routes");
const eventRoutes = require("./routes/event.routes");
const bookingRoutes = require("./routes/booking.routes");

app.use(express.json());

app.get("/health", ( _re, res) => {
  res.json({ status: "OK" });
});

app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/bookings", bookingRoutes);

module.exports = app;
