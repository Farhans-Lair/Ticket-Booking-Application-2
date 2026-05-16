require("dotenv").config();
require("./models"); // Initialize DB models & associations

const express      = require("express");
const cors         = require("cors");
const path         = require("path");
const rateLimit    = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const authenticate      = require("./middleware/auth.middleware");
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
const userRoutes        = require("./routes/user.routes");        // Feature 1
const errorHandler      = require("./middleware/error.middleware");

// Feature 3: Start reminder email scheduler
const { startReminderScheduler } = require("./services/reminder.services");

const app = express();

/* =====================================================
   CORS CONFIG
===================================================== */
const HTTPS_PORT = process.env.HTTPS_PORT || 3000;
const HTTP_PORT  = process.env.HTTP_PORT  || 3001;

const allowedOrigins = [
  `https://localhost:${HTTPS_PORT}`,
  `http://localhost:${HTTP_PORT}`,
  `http://localhost:${HTTPS_PORT}`,   // plain HTTP on same port (npm start / local dev)
  `http://localhost:3000`,            // explicit fallback for local npm start
  `http://127.0.0.1:3000`,           // 127.0.0.1 variant
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods:        ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials:    true,
  })
);

/* =====================================================
   Security Headers
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
app.use("/seats",         globalLimiter,  seatRoutes);
app.use("/api",           globalLimiter,  revenueRoutes);
app.use("/organizer",     globalLimiter,  organizerRoutes);
app.use("/cancellations", globalLimiter,  cancellationRoutes);
app.use("/user",          globalLimiter,  userRoutes);     // Feature 1: User profile

/* =====================================================
   HTML Page Routes
===================================================== */

// Public
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "../../frontend/index.html"))
);

// User pages
app.get("/events-page", (req, res) =>
  res.sendFile(path.join(__dirname, "../../frontend/events.html"))
);
app.get("/my-bookings", (req, res) =>
  res.sendFile(path.join(__dirname, "../../frontend/my-bookings.html"))
);
app.get("/payment", (req, res) =>
  res.sendFile(path.join(__dirname, "../../frontend/payment.html"))
);
app.get("/seat-selection", (req, res) =>
  res.sendFile(path.join(__dirname, "../../frontend/seat-selection.html"))
);

// Feature 1: User profile page
app.get("/profile", (req, res) =>
  res.sendFile(path.join(__dirname, "../../frontend/user-profile.html"))
);

// Organizer pages
app.get("/organizer-register", (req, res) =>
  res.sendFile(path.join(__dirname, "../../frontend/organizer-register.html"))
);
app.get("/organizer-dashboard", (req, res) =>
  res.sendFile(path.join(__dirname, "../../frontend/organizer-dashboard.html"))
);
app.get("/organizer-events", (req, res) =>
  res.sendFile(path.join(__dirname, "../../frontend/organizer-events.html"))
);
app.get("/organizer-revenue", (req, res) =>
  res.sendFile(path.join(__dirname, "../../frontend/organizer-revenue.html"))
);
app.get("/organizer-cancellation-policy", (req, res) =>
  res.sendFile(path.join(__dirname, "../../frontend/organizer-cancellation-policy.html"))
);

// Feature 5: Organizer payout page
app.get("/organizer-payouts", (req, res) =>
  res.sendFile(path.join(__dirname, "../../frontend/organizer-payouts.html"))
);

// Admin pages
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
   Feature 3: Start daily event reminder scheduler
===================================================== */
startReminderScheduler();

module.exports = app;
