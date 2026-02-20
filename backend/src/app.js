console.log("APP.JS LOADED");

require("dotenv").config();
require("./models"); // Load associations


const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const eventRoutes = require("./routes/event.routes");
const bookingRoutes = require("./routes/booking.routes");
const revenueRoutes = require("./routes/revenue.routes");

const app = express();


/* =====================================================
   ✅ CORS CONFIG
===================================================== */

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET","POST","PUT","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization"]
  })
);


/* =====================================================
   ✅ JSON Parsing
===================================================== */

app.use(express.json());


/* =====================================================
   🏥 HEALTH CHECK
===================================================== */

app.get("/health",(_req,res)=>{

res.status(200).json({

status:"ok"

});

});


/* =====================================================
   🔒 Disable Cache (Protected Pages)
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
   📦 API ROUTES
===================================================== */

app.use("/auth",authRoutes);

app.use("/events",eventRoutes);

app.use("/bookings",bookingRoutes);

/*
Revenue API
*/
app.use("/analytics",revenueRoutes);



/* =====================================================
   🎨 STATIC ASSETS
===================================================== */

app.use(
"/js",
express.static(
path.join(__dirname,"../frontend/js")
)
);

app.use(
"/css",
express.static(
path.join(__dirname,"../frontend/css")
)
);



/* =====================================================
   🌐 HTML PAGE ROUTES
===================================================== */


/*
Admin Dashboard
*/

app.get("/admin",(req,res)=>{

res.sendFile(

path.join(
__dirname,
"..",
"frontend",
"admin-dashboard.html"
)

);

});


/*
Revenue Analytics
*/

app.get("/admin-revenue",(req,res)=>{

res.sendFile(

path.join(
__dirname,
"..",
"frontend",
"admin-revenue.html"
)

);

});


/*
User Events Page
(API already uses /events)
Avoid collision.
*/

app.get("/events-page",(req,res)=>{

res.sendFile(

path.join(
__dirname,
"..",
"frontend",
"events.html"
)

);

});


/*
My Bookings
*/

app.get("/my-bookings",(req,res)=>{

res.sendFile(

path.join(
__dirname,
"..",
"frontend",
"my-bookings.html"
)

);

});


/*
Debug Route
*/

app.get("/debug-admin",(req,res)=>{

res.send("ADMIN ROUTE EXISTS");

});


/* =====================================================
   ❌ 404 HANDLER
===================================================== */

app.use((req,res)=>{

res.status(404).json({

error:"Route not found"

});

});


/* =====================================================
   🔥 GLOBAL ERROR HANDLER
===================================================== */

app.use((err,_req,res,_next)=>{

console.error("GLOBAL ERROR:",err.message);

res.status(err.statusCode || 500).json({

error:
err.message ||
"Internal Server Error"

});

});


module.exports = app;