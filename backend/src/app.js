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

/* =====================================================
   ✅ CORS (ENV SAFE)
===================================================== */

const allowedOrigin =
process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(
cors({

origin: allowedOrigin,

methods:["GET","POST","PUT","DELETE","OPTIONS"],

allowedHeaders:["Content-Type","Authorization"]

})
);

/* =====================================================
   JSON
===================================================== */

app.use(express.json());

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/health",(req,res)=>{

res.status(200).json({status:"ok"});

});

/* =====================================================
   NO CACHE (SECURITY)
===================================================== */

app.use((req,res,next)=>{

res.setHeader(
"Cache-Control",
"no-store, no-cache, must-revalidate, private"
);

res.setHeader("Pragma","no-cache");

res.setHeader("Expires","0");

next();

});

/* =====================================================
   API ROUTES
===================================================== */

app.use("/auth",authRoutes);

app.use("/events",eventRoutes);

app.use("/bookings",bookingRoutes);

app.use("/analytics",revenueRoutes);

/* =====================================================
   STATIC FRONTEND ASSETS
===================================================== */

const FRONTEND_PATH=

path.join(__dirname,"..","frontend");

/* JS */

app.use(
"/js",
express.static(
path.join(FRONTEND_PATH,"js")
)
);

/* CSS */

app.use(
"/css",
express.static(
path.join(FRONTEND_PATH,"css")
)
);

/*
STATIC HTML PAGES
*/

app.use(
"/pages",
express.static(
path.join(FRONTEND_PATH,"pages")
)
);

/* =====================================================
   INDEX PAGE
===================================================== */

app.get("/",(req,res)=>{

res.sendFile(

path.join(
FRONTEND_PATH,
"index.html"
)

);

});

/* =====================================================
   DEBUG ROUTE
===================================================== */

app.get("/debug-admin",(req,res)=>{

res.send("ADMIN ROUTE EXISTS");

});

/* =====================================================
   404
===================================================== */

app.use((req,res)=>{

res.status(404).json({

error:"Route not found"

});

});

/* =====================================================
   GLOBAL ERROR
===================================================== */

app.use((err,req,res,next)=>{

console.error("GLOBAL ERROR:",err.message);

res.status(err.statusCode || 500).json({

error:err.message || "Internal Server Error"

});

});

module.exports=app;