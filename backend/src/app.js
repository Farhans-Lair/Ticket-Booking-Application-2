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
const organizerRoutes   = require("./routes/organizer.routes");   // ← NEW
const errorHandler      = require("./middleware/error.middleware");

const app = express();

/* =====================================================
   CORS CONFIG
   Accept both http (redirect) and https origins so
   development works seamlessly.
===================================================== */


const HTTPS_PORT = process.env.HTTPS_PORT || 3000;
const HTTP_PORT  = process.env.HTTP_PORT  || 3001;

const allowedOrigins = [
  `https://localhost:${HTTPS_PORT}`,
  `http://localhost:${HTTP_PORT}`,
  process.env.FRONTEND_URL,          // production URL if set
].filter(Boolean);


app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, same-origin server calls)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods:        ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials:    true,
  })
);

/* =====================================================
   Security Headers (basic hardening)
===================================================== */
app.use((req, res, next) => {
  // Tell browsers to always use HTTPS for 1 year
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  // Prevent MIME-type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Basic XSS protection header (belt + suspenders with CSP)
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

/* =====================================================
   Cookie Parser (must be before routes)
===================================================== */
app.use(cookieParser());

/* =====================================================
   JSON Parsing
===================================================== */
app.use(express.json({ limit: "25mb" }));

/* =====================================================
   Health Check (ALB / CI)
===================================================== */
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

/* =====================================================
   RATE LIMITERS
===================================================== */

// Global — 100 req / 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Auth — stricter (10 / 15 min) for brute-force protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});

// Payment — 20 / 15 min
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many payment requests. Please slow down." },
});

/* =====================================================
   Prevent Browser Caching of Protected Pages
===================================================== */
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma",        "no-cache");
  res.setHeader("Expires",       "0");
  next();
});

/* =====================================================
   Static Assets (JS & CSS only)
===================================================== */
app.use("/js",  express.static(path.join(__dirname, "../../frontend/js")));
app.use("/css", express.static(path.join(__dirname, "../../frontend/css")));

/* =====================================================
   /auth/me — global limiter (called on every page load)
===================================================== */
app.get("/auth/me", globalLimiter, authenticate, authController.me);

/* =====================================================
   API Routes
===================================================== */
app.use("/auth",       authLimiter,    authRoutes);
app.use("/events",     globalLimiter,  eventRoutes);
app.use("/bookings",   globalLimiter,  bookingRoutes);
app.use("/payments",   paymentLimiter, paymentRoutes);
app.use("/seats",      globalLimiter,  seatRoutes);
app.use("/api",        globalLimiter,  revenueRoutes);
app.use("/organizer",  globalLimiter,  organizerRoutes);   // ← NEW

/* =====================================================
   HTML Page Routes (auth enforced client-side)
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

// Organizer pages (NEW)
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

module.exports = app;
