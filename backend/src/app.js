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
   ✅ CORS (LOCAL + PROD SAFE)
===================================================== */

const allowedOrigin =
process.env.CORS_ORIGIN ||
"http://localhost:3000";

app.use(
cors({

origin: allowedOrigin,

methods:["GET","POST","PUT","DELETE","OPTIONS"],

allowedHeaders:[
"Content-Type",
"Authorization"
]

})
);

/* =====================================================
   JSON BODY
===================================================== */

app.use(express.json());

/* =====================================================
   HEALTH CHECK (ALB / Docker)
===================================================== */

app.get("/health",(req,res)=>{

res.status(200).json({

status:"ok"

});

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
   FRONTEND STATIC FILES
===================================================== */

const FRONTEND_PATH =
path.join(
__dirname,
"..",
"frontend"
);

/* JS */

app.use(

"/js",

express.static(

path.join(
FRONTEND_PATH,
"js"
)

)

);

/* CSS */

app.use(

"/css",

express.static(

path.join(
FRONTEND_PATH,
"css"
)

)

);

/* HTML PAGES */

app.use(

"/pages",

express.static(

path.join(
FRONTEND_PATH,
"pages"
)

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
   ✅ BACKWARD COMPATIBILITY REDIRECTS
   (Old bookmarks / old JS navigation safe)
===================================================== */

app.get("/admin",(req,res)=>{

res.redirect(

"/pages/admin-dashboard.html"

);

});


app.get("/admin-revenue",(req,res)=>{

res.redirect(

"/pages/admin-revenue.html"

);

});


app.get("/my-bookings",(req,res)=>{

res.redirect(

"/pages/my-bookings.html"

);

});


app.get("/events-page",(req,res)=>{

res.redirect(

"/pages/events.html"

);

});

/* =====================================================
   DEBUG ROUTE (OPTIONAL)
===================================================== */

app.get("/debug-admin",(req,res)=>{

res.send("ADMIN ROUTE EXISTS");

});

/* =====================================================
   404 HANDLER
===================================================== */

app.use((req,res)=>{

res.status(404).json({

error:"Route not found"

});

});

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use((err,req,res,next)=>{

console.error(

"GLOBAL ERROR:",

err.message

);

res.status(

err.statusCode || 500

).json({

error:

err.message ||

"Internal Server Error"

});

});

module.exports = app;