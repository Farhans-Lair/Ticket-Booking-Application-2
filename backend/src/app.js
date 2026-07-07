require("dotenv").config({ quiet: true });
require("./models"); // Initialize DB models & associations

const express      = require("express");
const cors         = require("cors");
const path         = require("path");
const rateLimit    = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const authenticate      = require("./middleware/auth.middleware");
const correlationId     = require("./middleware/correlationId.middleware");

const authController    = require("./controllers/auth.controllers");
const authRoutes        = require("./routes/auth.routes");
const eventRoutes       = require("./routes/event.routes");
const bookingRoutes     = require("./routes/booking.routes");
const revenueRoutes     = require("./routes/revenue.routes");
const adminRoutes       = require("./routes/admin.routes");
const paymentRoutes     = require("./routes/payment.routes");
const seatRoutes        = require("./routes/seat.routes");
const organizerRoutes   = require("./routes/organizer.routes");
const cancellationRoutes = require("./routes/cancellation.routes");
const userRoutes        = require("./routes/user.routes");
const catCtrl           = require("./controllers/category.controllers");
const errorHandler      = require("./middleware/error.middleware");

const searchRoutes   = require("./routes/search.routes");
const checkinRoutes  = require("./routes/checkin.routes");
const couponRoutes   = require("./routes/coupon.routes");
const reviewRoutes   = require("./routes/review.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const waitlistRoutes = require("./routes/waitlist.routes");

const { startSeatHoldScheduler } = require("./services/seatHold.scheduler");
const { startReminderScheduler } = require("./services/reminder.services");

const app = express();

app.use(correlationId);

/* =====================================================
   CORS CONFIG
===================================================== */
const HTTPS_PORT = process.env.HTTPS_PORT || 3000;
const HTTP_PORT  = process.env.HTTP_PORT  || 3001;

const allowedOrigins = [
  `https://localhost:${HTTPS_PORT}`,
  `http://localhost:${HTTP_PORT}`,
  `http://localhost:${HTTPS_PORT}`,
  `http://localhost:3000`,
  `http://127.0.0.1:3000`,
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods:        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-ID"],
    exposedHeaders: ["X-Correlation-ID"],
    credentials:    true,
  })
);

app.use((req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Frame-Options",       "DENY");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-XSS-Protection",      "1; mode=block");
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: "25mb" }));

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

/* =====================================================
   RATE LIMITERS
===================================================== */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many payment requests. Please slow down." },
});

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma",        "no-cache");
  res.setHeader("Expires",       "0");
  next();
});

app.use("/js",  express.static(path.join(__dirname, "../../frontend/js")));
app.use("/css", express.static(path.join(__dirname, "../../frontend/css")));

app.get("/auth/me", globalLimiter, authenticate, authController.me);

/* =====================================================
   API Routes
===================================================== */
app.use("/auth",          authLimiter,    authRoutes);
app.use("/events",        globalLimiter,  eventRoutes);
app.use("/bookings",      globalLimiter,  bookingRoutes);
app.use("/payments",      paymentLimiter, paymentRoutes);
app.use("/seats",         globalLimiter,  seatRoutes);
app.use("/api",           globalLimiter,  revenueRoutes);
app.use("/cancellations", globalLimiter,  cancellationRoutes);
app.use("/user",          globalLimiter,  userRoutes);
app.use("/search",        globalLimiter,  searchRoutes);
app.use("/checkin",       globalLimiter,  checkinRoutes);
app.use("/coupons",       globalLimiter,  couponRoutes);
app.use("/reviews",       globalLimiter,  reviewRoutes);
app.use("/wishlist",      globalLimiter,  wishlistRoutes);
app.use("/waitlist",      globalLimiter,  waitlistRoutes);

/* =====================================================
   HTML Page Routes
   NOTE: /organizer must be registered AFTER all
   /organizer API sub-routes to avoid conflicts.
===================================================== */
const sendPage = (file) => (req, res) =>
  res.sendFile(path.join(__dirname, `../../frontend/${file}`));

app.get("/",                              sendPage("index.html"));
app.get("/events-page",                   sendPage("events.html"));
app.get("/my-bookings",                   sendPage("my-bookings.html"));
app.get("/payment",                       sendPage("payment.html"));
app.get("/seat-selection",                sendPage("seat-selection.html"));
app.get("/profile",                       sendPage("user-profile.html"));
app.get("/organizer-register",            sendPage("organizer-register.html"));
app.get("/organizer-dashboard",           sendPage("organizer-dashboard.html"));
app.get("/organizer-events",              sendPage("organizer-events.html"));
app.get("/organizer-revenue",             sendPage("organizer-revenue.html"));
app.get("/organizer-cancellation-policy", sendPage("organizer-cancellation-policy.html"));
app.get("/organizer-payouts",             sendPage("organizer-payouts.html"));
// FIX 3: These page routes were missing — caused 404 on /organizer/checkin and /wishlist-page
app.get("/organizer/checkin",             sendPage("checkin.html"));
app.get("/wishlist-page",                 sendPage("wishlist.html"));

app.get("/categories", catCtrl.listCategories);

// NOTE: /organizer API routes registered here, AFTER the specific page routes above
app.use("/organizer", globalLimiter, organizerRoutes);

app.use("/admin", adminRoutes);

/* =====================================================
   404 Handler
===================================================== */
app.use((req, res) => res.status(404).json({ error: "Route not found." }));

app.use(errorHandler);

// Don't start background schedulers during tests — they keep the Jest
// process alive and fire DB queries against an already-closed connection.
if (process.env.NODE_ENV !== "test") {
  startSeatHoldScheduler();
  startReminderScheduler();
}

module.exports = app;
