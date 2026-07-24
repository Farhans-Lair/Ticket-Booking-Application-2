# TicketVerse — Event Ticketing Platform

A full-stack, multi-role event ticketing platform. Node.js/Express backend with MySQL (Sequelize ORM), a vanilla HTML/CSS/JS frontend, Docker Compose for local containerization, and Terraform-managed AWS infrastructure (EC2 Auto Scaling Group + ALB, Multi‑AZ RDS with a read replica, S3, CloudWatch) with a GitHub Actions CI/CD pipeline.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Feature Set](#feature-set)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [Database Setup](#database-setup)
8. [API Reference](#api-reference)
9. [Frontend Pages](#frontend-pages)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [License](#license)

---

## Project Overview

TicketVerse is a three-role ticketing platform:

| Role | Capabilities |
|---|---|
| **User** | Browse/search events, hold seats, book tickets, pay via Razorpay, apply coupons, download tickets/invoices as PDF, cancel bookings for a tiered refund, review events, save events to a wishlist, join a waitlist for sold-out events, receive reminder emails/SMS |
| **Organizer** | Register (subject to admin approval), create & manage events (subject to moderation), configure seat tiers, set a cancellation policy, view revenue/attendees, request payouts, check in attendees via QR scan |
| **Admin** | Moderate events (approve/reject), manage organizer applications, manage dynamic event categories, feature/trend events, manage coupons, process organizer payouts, view platform-wide revenue |

---

## Architecture

```
Ticket-Booking-Application-2-main/
├── backend/
│   ├── Dockerfile
│   ├── jest.config.js / jest.setup.js
│   ├── package.json
│   ├── scripts/
│   └── src/
│       ├── app.js                    # Express app: middleware, routes, static pages
│       ├── server.js                 # HTTP/HTTPS bootstrap + DB init
│       ├── config/                   # database.js, database-replica.js, logger.js, s3.js
│       ├── controllers/              # 17 route-handler modules
│       ├── services/                 # 19 business-logic modules
│       ├── models/                   # 13 Sequelize models + index.js (associations)
│       ├── routes/                   # 17 Express routers
│       ├── middleware/               # auth, authorization, correlation-id, validation, errors
│       ├── validators/                # express-validator chains
│       └── __tests__/                # Jest + Supertest suites
├── frontend/                         # Vanilla HTML/CSS/JS, one HTML page per screen
│   ├── css/  (styles.css, dashboard-shell.css)
│   └── js/   (api.js, auth.js, events.js, starfield.js, …)
├── db/
│   ├── master_schema.sql             # Full schema — fresh installs
│   └── migration.sql                 # Incremental ALTERs — existing databases
├── terraform/                        # AWS infrastructure as code
├── docker-compose.yml                # Local backend + MySQL stack
└── .github/workflows/                # CI (test) + CD (build, push, deploy) pipeline
```

### Request flow (high level)

```
Browser (frontend/*.html + js/*.js)
   │  fetch() via api.js (adds Authorization header + cookies)
   ▼
Express app.js
   │  correlationId → CORS → security headers → rate limiters → routes
   ▼
routes/*.routes.js  →  middleware (auth / authorizeOrganizer / authorizeAdmin)
   ▼
controllers/*.controllers.js   (request validation, response shaping)
   ▼
services/*.services.js         (business logic, Sequelize transactions)
   ▼
models/*.js  →  Sequelize  →  MySQL (primary + optional read replica)
```

---

## Tech Stack

**Backend:** Node.js ≥ 22, Express 5, Sequelize 6 (MySQL2 driver), JSON Web Tokens, bcrypt, express-validator, express-rate-limit, node-cron, Nodemailer, PDFKit, `qrcode`, Razorpay SDK, Twilio SDK, AWS SDK v3 (S3), Jest + Supertest.

**Frontend:** Vanilla HTML5 / CSS3 / JavaScript (no framework) with a shared dark-theme "dashboard shell" (`css/dashboard-shell.css`, `js/starfield.js`) reused across all admin/organizer/user screens.

**Data:** MySQL 8.x via Sequelize ORM, `underscored: true` (snake_case columns), a primary connection (`config/database.js`) and an optional read-replica connection (`config/database-replica.js`) that falls back to the primary when `DB_HOST_REPLICA` is unset.

**Infrastructure:** Docker + Docker Compose (local), Terraform-managed AWS (VPC with public/private subnets, EC2 Auto Scaling Group behind an Application Load Balancer, Multi-AZ RDS MySQL with a read replica and automated backups, S3 for PDFs, ECR, CloudWatch log groups/alarms, IAM roles), GitHub Actions (OIDC-authenticated) for test → build → push → SSM-deploy.

---

## Feature Set

### Core booking flow
- OTP-based email verification for signup and login (separate OTP purposes for user, organizer signup)
- JWT access tokens (8 h) + rotating, hashed refresh tokens with a 7-day sliding window, delivered via `httpOnly` cookies, plus a per-tab session token for multi-user/multi-tab isolation
- Event browsing with full-text search (`MATCH … AGAINST`, LIKE fallback), city/category/price/date filters
- Seat map with per-tier pricing and a 10-minute seat hold (cron sweep releases expired holds every minute)
- Razorpay order creation → signature-verified payment confirmation inside a DB transaction
- Coupon codes (percentage or flat, usage limits, per-user limits, min order amount)
- QR-code tickets (signed JWT) with an organizer check-in endpoint
- PDF ticket, booking invoice, and cancellation invoice generation, stored in S3 with on-the-fly regeneration fallback
- Tiered cancellation & refund policy (organizer-defined hour thresholds), automatic Razorpay refund initiation and webhook-confirmed completion
- Reviews & star ratings (verified-booking only), cached average on the Event row
- Wishlist (optional "notify on availability") and Waitlist (auto-notified in booking order when seats free up)
- Daily 09:00 event-reminder emails (24-hour lookahead) and SMS notifications (booking confirmation, cancellation) via Twilio with an in-memory sender-affinity cache
- Correlation-ID request tracing (`X-Correlation-ID`) end to end

### Organizer & Admin
- Organizer self-registration → admin approval workflow
- Organizer-submitted events start `pending` and require admin moderation before going public; admin-created events are auto-approved
- Dynamic, admin-managed event categories (emoji/image, sort order, active flag)
- Featured & trending (30-day booking volume) events for the homepage
- Organizer revenue/attendee dashboards and payout requests; admin settlement calculator (10% platform fee) and payout lifecycle (`pending → processing → paid` / `failed`)

### Platform / security
- Role-based authorization middleware (`authenticate`, `authorizeOrganizer`, `authorizeAdmin`)
- Global / auth / payment rate limiters, security headers (HSTS, X-Frame-Options, nosniff, XSS protection), strict CORS allow-list
- HTTPS in local dev (mkcert certs) with HTTP→HTTPS redirect; plain HTTP in AWS with TLS terminated at the ALB
- Structured logging via a shared logger; correlation IDs threaded through every log line

---

## Getting Started

### Prerequisites
- Node.js ≥ 22
- MySQL 8.x
- (Optional) AWS account for S3-backed PDF storage
- (Optional) Razorpay and Twilio accounts for payments/SMS

### Local installation

```bash
# 1. Clone
git clone https://github.com/Farhans-Lair/Ticket-Booking-Application-2.git
cd Ticket-Booking-Application-2-main

# 2. Install backend dependencies
cd backend
npm install

# 3. Configure environment
cp .env.example .env      # create backend/.env — see Environment Variables below

# 4. Load the database schema (fresh install)
mysql -u root -p ticket_booking_db < ../db/master_schema.sql

# 5. Run
npm run dev     # nodemon, local development
npm start       # production
```

### Docker Compose (local, HTTPS)

```bash
docker-compose up --build
```
Starts a MySQL container and the backend container together; visit `https://localhost` (mkcert certs mounted read-only from `./certs`). Requires a root-level `.env` with `DB_HOST=mysql`.

---

## Environment Variables

```env
# Database
DB_HOST=127.0.0.1          # 127.0.0.1 for local npm start, "mysql" for docker-compose
DB_PORT=3306
DB_NAME=ticket_booking_db
DB_USER=ticket_user_1
DB_PASSWORD=your_password
DB_HOST_REPLICA=            # leave empty locally — falls back to primary

# JWT (three independent secrets)
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_SESSION_SECRET=
QR_JWT_SECRET=              # falls back to JWT_SECRET if unset

# Email (Gmail + App Password)
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=     # optional — verifies refund webhook signature

# Twilio (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=
TWILIO_PHONE_NUMBER=
APP_BASE_URL=                # used to build links in SMS

# AWS S3 (PDF storage)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=ticketverse-pdfs

# Frontend / networking
FRONTEND_URL=https://yourdomain.com
HTTPS_PORT=3000
HTTP_PORT=3001
USE_HTTPS=true               # true = local mkcert TLS, false = AWS/ALB terminates TLS
SSL_KEY_PATH=./certs/server.key
SSL_CERT_PATH=./certs/server.crt
COOKIE_SECURE=false          # true in production (HTTPS only)
```

---

## Database Setup

| File | Purpose |
|---|---|
| `db/master_schema.sql` | Complete schema — run once on a fresh/empty database |
| `db/migration.sql` | Incremental `ALTER`/`CREATE` statements — run on an existing database being upgraded |

Both files consolidate what were previously several feature-by-feature migration scripts. Sequelize also runs `sequelize.sync({ alter: true })` on server start as a safety net for new columns.

---

## API Reference

All endpoints are mounted under their route prefix in `app.js`, e.g. `/auth`, `/events`, `/bookings`, `/payments`, `/seats`, `/cancellations`, `/user`, `/search`, `/checkin`, `/coupons`, `/reviews`, `/wishlist`, `/waitlist`, `/organizer`, `/admin`, `/api` (revenue), plus `/categories`.

### Auth (`/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/signup-request` | Public | Send signup OTP |
| POST | `/signup-verify` | Public | Verify OTP & create user account |
| POST | `/login-request` | Public | Validate credentials, send login OTP |
| POST | `/login-verify` | Public | Verify OTP, issue access/refresh/session tokens |
| POST | `/organizer-signup-request` | Public | Submit business details, send OTP |
| POST | `/organizer-signup-verify` | Public | Verify OTP, create user (role=organizer) + pending profile |
| POST | `/refresh` | Cookie | Rotate refresh token, issue new token set |
| POST | `/logout` | Auth | Revoke refresh token, clear cookies |
| GET | `/me` | Auth | Return `{ userId, role }` |

### Events (`/events`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/featured` | Public | Admin-curated featured events |
| GET | `/trending` | Public | Most-booked events, last 30 days |
| GET | `/` | Auth | All approved events (optional `?category=`) |
| POST | `/` | Admin | Create event (auto-approved) |
| PUT | `/:id` | Admin | Update event |
| DELETE | `/:id` | Admin | Delete event |

### Search (`/search`)
`GET /` (full-text `?q=`), `GET /events` (city/category/price/date filters), `GET /cities` (distinct city list) — all public.

### Seats (`/seats`)
`GET /:eventId`, `GET /:eventId/tiers`, `PUT /:eventId/tiers` (organizer/admin), `POST /:eventId/hold` (10-minute lock) — all auth required.

### Bookings & Payments
`POST /payments/create-order`, `POST /payments/verify`, `GET /bookings/my-bookings`, `GET /bookings/:id/download-ticket`, `GET /bookings/:id/download-invoice`, `GET /bookings/:id/qr` — all auth required.

### Cancellations (`/cancellations`)
`GET /preview/:bookingId`, `POST /:bookingId`, `GET /:bookingId/download-invoice`, `GET /policy/:eventId`, `PUT /policy/:eventId` (organizer), `POST /webhook/refund` (Razorpay, unauthenticated + HMAC verified).

### Coupons, Reviews, Wishlist, Waitlist, Check-in
Standard CRUD/action endpoints under `/coupons`, `/reviews`, `/wishlist`, `/waitlist`, `/checkin` — see inline route comments; most read endpoints are public, all write endpoints require authentication.

### Organizer (`/organizer`)
Profile, stats, events CRUD, attendees, revenue, payouts (`GET /payouts`, `POST /payouts/request`) — all `authorizeOrganizer`. Admin-only organizer management (`/admin/organizers/*`) is mounted on the same router.

### Admin (`/admin`)
Moderation (`/moderation/events*`, `/events/:id/feature`), payouts (`/payouts/*`), categories (`/categories*`) — all `authorizeAdmin`.

### Revenue (`/api/revenue`)
Platform-wide effective-revenue report (admin only), cancellation-adjusted.

### User (`/user`)
`/profile` (GET/PUT), `/profile/password` (PUT), `/profile/bookings` (GET) — all authenticated.

---

## Frontend Pages

| URL | File | Role |
|---|---|---|
| `/` | `index.html` | Public — login/register |
| `/events-page` | `events.html` | User — browse, search, featured/trending |
| `/profile` | `user-profile.html` | User |
| `/my-bookings` | `my-bookings.html` | User |
| `/seat-selection` | `seat-selection.html` | User |
| `/payment` | `payment.html` | User |
| `/wishlist-page` | `wishlist.html` | User |
| `/organizer-register` | `organizer-register.html` | Public |
| `/organizer-dashboard` | `organizer-dashboard.html` | Organizer |
| `/organizer-events` | `organizer-events.html` | Organizer |
| `/organizer-revenue` | `organizer-revenue.html` | Organizer |
| `/organizer-payouts` | `organizer-payouts.html` | Organizer |
| `/organizer-cancellation-policy` | `organizer-cancellation-policy.html` | Organizer |
| `/organizer/checkin` | `checkin.html` | Organizer |
| `/admin` | `admin-dashboard.html` | Admin |
| `/admin/organizers` | `admin-organizers.html` | Admin |
| `/admin/moderation` | `admin-moderation.html` | Admin |
| `/admin/payouts` | `admin-payouts.html` | Admin |
| `/admin/revenue` | `admin-revenue.html` | Admin |
| `/admin/categories/manage` | `admin-categories.html` | Admin |
| `/admin/coupons` | `admin-coupons.html` | Admin |

---

## Testing

```bash
cd backend
npm test        # Jest --runInBand --forceExit
```
Suites live in `backend/src/__tests__/` and cover health, DB connectivity, booking, cancellation, payment, and seat business logic. Tests use `jest.isolateModules()` per file (not global `resetModules`) and run with minimal Express apps rather than the full `app.js` to avoid Sequelize instance/model caching issues across files. Background schedulers (seat-hold sweep, reminder emails) are disabled when `NODE_ENV=test`.

---

## Deployment

GitHub Actions (`.github/workflows/docker-build.yml`) runs on every push to `main`/`bootstrap`:
1. **test** job — spins up a MySQL 8 service container, loads `master_schema.sql`, runs `npm ci` + `npm test`.
2. **deploy** job (main branch only) — OIDC-authenticates to AWS, builds the Docker image, pushes to ECR, and deploys to the running EC2 instance via AWS Systems Manager (SSM), skipping gracefully if no instance exists yet.

The `terraform/` directory provisions:
- VPC with public and private subnets, NAT Gateway
- EC2 Auto Scaling Group (private subnets) behind an Application Load Balancer (public subnets, TLS termination)
- Multi-AZ RDS MySQL with automated backups, deletion protection, and a read replica
- S3 bucket for tickets/invoices
- ECR repository, CloudWatch log groups/alarms, IAM roles (including GitHub OIDC role for CI/CD)

---

## License

ISC
