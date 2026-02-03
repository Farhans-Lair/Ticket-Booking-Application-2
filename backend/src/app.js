require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

app.use(express.json());

const authRoutes = require("./routes/auth.routes");
const eventRoutes = require("./routes/event.routes");
const bookingRoutes = require("./routes/booking.routes");


app.get("/health", ( _re, res) => {
  res.json({ status: "OK" });
});

app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/bookings", bookingRoutes);

module.exports = app;
