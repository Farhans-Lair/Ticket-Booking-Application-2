console.log("APP.JS LOADED"); 
require("dotenv").config(); 
require("./models"); // 👈 ADD THIS 
// 
const express = require("express"); 

const cors = require("cors"); 

const path = require("path"); 

const authenticate = require("./middleware/auth.middleware"); 

const authorizeAdmin = require("./middleware/authorizeadmin"); 

const authRoutes = require("./routes/auth.routes"); 

const eventRoutes = require("./routes/event.routes"); 

const bookingRoutes = require("./routes/booking.routes"); 

const revenueRoutes = require("./routes/revenue.routes"); 

const app = express(); 

app.use( 
  cors({ origin: "http://localhost:3000", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
  allowedHeaders: ["Content-Type", "Authorization"], 
}) 
);

app.use(express.json());

app.get("/health", (_req, res) => { res.status(200).json({ status: "ok" }); });

app.use((req, res, next) => { 
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private"); 
  res.setHeader("Pragma", "no-cache"); 
  res.setHeader("Expires", "0"); 
  next(); 
}
);

app.use("/auth", authRoutes); 
app.use("/events", eventRoutes); 
app.use("/bookings", bookingRoutes); 
app.use("/revenue",revenueRoutes);

app.use("/js", express.static(path.join(__dirname, "../frontend/js"))); 
app.use("/css", express.static(path.join(__dirname, "../frontend/css")));

app.get("/admin", (req, res) => { res.sendFile(path.join(__dirname, "../frontend/admin-dashboard.html")); });

app.get("/admin-revenue",(req,res)=>{res.sendFile(path.join(__dirname,"../frontend/admin-revenue.html")); });

app.get("/debug-admin", (req, res) => { res.send("ADMIN ROUTE EXISTS"); });

app.use((req, res) => { res.status(404).json({ error: "Route not found" }); });

app.use((err, _req, res, _next) => { console.error("GLOBAL ERROR:", err.message); res.status(err.statusCode || 500).json({ error: err.message || "Internal Server Error", }); });

module.exports = app;