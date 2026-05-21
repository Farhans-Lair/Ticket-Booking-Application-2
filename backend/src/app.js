require("dotenv").config();
require("./models"); // Initialize DB models & associations

const express      = require("express");
const cors         = require("cors");
const path         = require("path");
const rateLimit    = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const authenticate      = require("./middleware/auth.middleware");
// Feature 8: Correlation ID tracing — must be first middleware
const correlationId     = require("./middleware/correlationId.middleware");

const authController    = require("./controllers/auth.controllers");
const authRoutes        = require("./routes/auth.routes");
const eventRoutes       = require("./routes/event.routes");
const bookingRoutes     = require("./routes/booking.routes");
const revenueRoutes     = require("./routes/revenue.routes");
const adminRoutes       = require("./routes/admin.routes");
const paymentRoutes     = require("./routes/payment.routes");
const seatRoutes        = require("./routes/seat.routes");        // Feature 1: hold
const organizerRoutes   = require("./routes/organizer.routes");
const cancellationRoutes = require("./routes/cancellation.routes");
const userRoutes        = require("./routes/user.routes");
const catCtrl           = require("./controllers/category.controllers");
const errorHandler      = require("./middleware/error.middleware");

// New feature routes
const searchRoutes   = require("./routes/search.routes");   // Feature 2: Search + filters
const checkinRoutes  = require("./routes/checkin.routes");  // Feature 3: QR check-in
const couponRoutes   = require("./routes/coupon.routes");   // Feature 4: Coupons
const reviewRoutes   = require("./routes/review.routes");   // Feature 5: Reviews
const wishlistRoutes = require("./routes/wishlist.routes"); // Feature 6: Wishlist
const waitlistRoutes = require("./routes/waitlist.routes"); // Feature 7: Waitlist

// Feature 1: Seat hold expiry scheduler
const { startSeatHoldScheduler } = require("./services/seatHold.scheduler");
// Feature 3 (existing): event reminder scheduler
const { startReminderScheduler } = require("./services/reminder.services");

const app = express();

/* =====================================================
   Feature 8: Correlation ID — attach before everything
===================================================== */
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

/* =====================================================
   Security Headers  (Feature 9: HTTPS redirect handled in server.js)
===================================================== */
app.use((req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Frame-Options",       "DENY");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-XSS-Protection",      "1; mode=block");
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: "25mb" }));

/* =====================================================
   Health Check
===================================================== */
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

/* =====================================================
   No-cache for protected pages
===================================================== */
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma",        "no-cache");
  res.setHeader("Expires",       "0");
  next();
});

/* =====================================================
   Static Assets
===================================================== */
app.use("/js",  express.static(path.join(__dirname, "../../frontend/js")));
app.use("/css", express.static(path.join(__dirname, "../../frontend/css")));

/* =====================================================
   /auth/me
===================================================== */
app.get("/auth/me", globalLimiter, authenticate, authController.me);

/* =====================================================
   API Routes
===================================================== */
app.use("/auth",          authLimiter,    authRoutes);
app.use("/events",        globalLimiter,  eventRoutes);
app.use("/bookings",      globalLimiter,  bookingRoutes);
app.use("/payments",      paymentLimiter, paymentRoutes);
app.use("/seats",         globalLimiter,  seatRoutes);        // Feature 1: +hold
app.use("/api",           globalLimiter,  revenueRoutes);
app.use("/organizer",     globalLimiter,  organizerRoutes);
app.use("/cancellations", globalLimiter,  cancellationRoutes);
app.use("/user",          globalLimiter,  userRoutes);

// Feature 2: Search + city/price/date filters (public, no auth)
app.use("/search",   globalLimiter, searchRoutes);

// Feature 3: QR check-in
app.use("/checkin",  globalLimiter, checkinRoutes);

// Feature 4: Coupons
app.use("/coupons",  globalLimiter, couponRoutes);

// Feature 5: Reviews & ratings
app.use("/reviews",  globalLimiter, reviewRoutes);

// Feature 6: Wishlist
app.use("/wishlist", globalLimiter, wishlistRoutes);

// Feature 7: Waitlist
app.use("/waitlist", globalLimiter, waitlistRoutes);

/* =====================================================
   HTML Page Routes
===================================================== */
const sendPage = (file) => (req, res) =>
  res.sendFile(path.join(__dirname, `../../frontend/${file}`));

// Public
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

// Public: category list
app.get("/categories", catCtrl.listCategories);

app.use("/admin", adminRoutes);

/* =====================================================
   404 Handler
===================================================== */
app.use((req, res) => res.status(404).json({ error: "Route not found." }));

/* =====================================================
   Global Error Handler
===================================================== */
app.use(errorHandler);

/* =====================================================
   Start Schedulers
===================================================== */
startSeatHoldScheduler();   // Feature 1: sweep expired holds every minute
startReminderScheduler();   // existing: daily event reminder emails

module.exports = app;
