# TicketVerse — Ticket Booking Application

A full-stack event ticketing platform built with Node.js / Express (backend) and vanilla HTML/CSS/JS (frontend), backed by MySQL via Sequelize ORM. Deployed on AWS as a Dockerized Node app behind an Auto Scaling Group and Application Load Balancer, with a Multi-AZ RDS MySQL primary and a dedicated read replica.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [API Reference](#api-reference)
- [Frontend Pages](#frontend-pages)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Project Overview

TicketVerse is a multi-role ticketing platform supporting:

| Role | Capabilities |
|---|---|
| **User** | Browse/search events, book tickets, select seats, apply coupons, manage profile, view bookings, cancel with tiered refunds, download tickets/invoices, leave reviews, wishlist events, join waitlists |
| **Organizer** | Register (admin-approved), create & manage events (subject to admin moderation), define seat tiers, scan tickets at check-in, set cancellation policy, view revenue & payout history |
| **Admin** | Moderate events, manage organizers, manage event categories, create/manage coupons, process payouts, feature events, view platform-wide revenue |

---

## Architecture

```
Ticket-Booking-Application-2/
├── backend/
│   ├── Dockerfile
│   ├── jest.config.js / jest.setup.js
│   └── src/
│       ├── app.js                    # Express app, routes, security headers, rate limiting
│       ├── server.js                 # HTTP/HTTPS bootstrap + Umzug migration runner
│       ├── config/
│       │   ├── database.js           # Primary Sequelize connection
│       │   ├── database-replica.js   # Read-replica Sequelize connection
│       │   ├── migrator.js           # Umzug migration engine
│       │   ├── s3.js                 # AWS S3 client
│       │   └── logger.js             # JSON file logger (app.log / error.log)
│       ├── controllers/              # Route handlers (17 modules)
│       ├── services/                 # Business logic (19 modules)
│       ├── models/                   # 13 Sequelize models
│       ├── routes/                   # 15 route modules
│       ├── middleware/               # auth, admin/organizer authz, validation, error, correlation ID
│       ├── validators/               # express-validator chains
│       ├── migrations/               # Umzug migration files (run automatically on boot)
│       └── __tests__/                # Jest + Supertest unit/integration tests
├── frontend/                         # Vanilla HTML/CSS/JS, 20 pages
│   ├── js/
│   └── css/
├── db/
│   ├── master_schema.sql             # Full baseline schema (source of truth)
│   └── migration.sql                 # Incremental SQL reference
└── terraform/                        # AWS infrastructure (VPC + EC2 ASG + ALB + RDS + S3 + CloudWatch)
```

The backend is a single Express monolith (not microservices) — one Node process serves the JSON API, the static frontend, and the SSR-style page routes (`res.sendFile`) that map clean URLs like `/profile` or `/organizer-dashboard` to HTML files in `frontend/`.

### Request flow

```
Browser → ALB (HTTPS, self-signed cert) → EC2 Auto Scaling Group (Docker, port 3000)
                                              ├─ Express app (rate-limited, CORS-locked)
                                              ├─ RDS MySQL primary (writes + most reads)
                                              ├─ RDS MySQL read replica (GET-heavy reads, per Terraform output notes)
                                              └─ S3 (ticket PDFs & invoices)
```

Two background jobs run inside the same Node process (not separate workers):
- **Seat-hold sweeper** — `node-cron`, every minute, releases seat holds whose 10-minute TTL has expired.
- **Event-reminder scheduler** — `node-cron`, daily at 09:00 IST, emails users with paid bookings for events starting within 24 hours.

---

## Features

### Authentication & Sessions
- OTP-based signup and login (email verification) for both users and organizers, via separate signup/login OTP flows.
- Three-token JWT model: short-lived **access token**, rotating **refresh token** (opaque, DB-backed, hashed with SHA-256, stored in `refresh_tokens`), and a **session token** — all delivered as `HttpOnly` cookies (`token`, `refreshToken` scoped to `/auth/refresh`).
- `POST /auth/refresh` rotates the refresh token on every use.
- Role-based authorization middleware (`authorizeAdmin`, `authorizeOrganizer`) — organizer routes additionally check `OrganizerProfile.status` (`pending` / `approved` / `rejected`) before granting access.

### Events & Discovery
- Admin-created events are auto-approved; organizer-submitted events start `pending` and require admin moderation before appearing publicly.
- Featured carousel (admin-curated) and Trending grid (computed from paid-booking volume in the last 30 days).
- Full-text search (`MATCH...AGAINST`) with automatic fallback to `LIKE` search if the FULLTEXT index/query fails.
- Filterable event search by city, category, price range, and date range; distinct-cities endpoint for filter dropdowns.
- Event categories (admin-managed): name, slug, emoji icon, image, sort order, active flag.

### Booking & Seats
- Real-time seat selection with a 10-minute hold (`seats.status = 'held'`), automatically released by the per-minute sweep job if unconfirmed.
- Seat tiers (e.g. Gold/Silver/General) assignable per event by the organizer or admin, each with its own price.
- Razorpay payment integration: order creation, signature verification, and a refund webhook endpoint.
- Convenience fee + GST are computed on top of the ticket price (`CONVENIENCE_FEE_RATE`, `GST_RATE`, both env-configurable, default 10% / 9%).
- Coupon codes: percentage or flat discount, min order amount, max discount cap, usage limits (global + per-user), validity window, and status lifecycle (`active` / `inactive` / `expired`).
- PDF ticket and invoice generation (via `pdfkit`), stored in S3 and downloadable per booking.
- QR-code check-in: each ticket embeds a signed JWT (booking/user/event); `POST /checkin` verifies the token, confirms payment/cancellation status, and marks the booking checked-in (rejecting already-scanned tickets).

### Cancellations & Refunds
- Tiered cancellation policy per event (JSON `tiers` array + `is_cancellation_allowed` flag), configurable by the organizer.
- Cancellation fee + GST-on-fee computed from env-configurable rates (`CANCELLATION_FEE_RATE` default 5%, `CANCELLATION_FEE_GST_RATE` default 5%), with a configurable high-tier cutoff (`CANCELLATION_HIGH_TIER_CUTOFF_HOURS`, default 72h before the event).
- Cancellation invoice (credit note) generation and download.
- Revenue reporting reconciles gross vs. effective (post-cancellation) revenue per booking.

### Reviews, Wishlist & Waitlist
- Star ratings (1–5) + text review per user per event (one review per user/event, unique constraint), with a `verified_booking` flag and an aggregate rating-summary endpoint.
- Wishlist: save/remove events, optional "notify on availability" flag.
- Waitlist: join/leave a per-event queue with a requested ticket count, plus a public queue-stats endpoint.

### Organizer Tools
- Self-service registration with an OTP-gated signup flow; goes live only after admin approval (with a visible rejection reason if declined).
- Own-event CRUD, per-event attendee list, seat-tier management, cancellation-policy editor, revenue breakdown, and payout history.
- Check-in scanner page for scanning attendee QR codes at the door.

### Admin Tools
- Event moderation queue (pending / all-with-status), approve/reject with an optional note, feature toggle.
- Organizer approval queue, plus reject/delete.
- Category management (CRUD).
- Coupon management (create, list, activate/deactivate).
- Payout engine: platform fee is `PLATFORM_FEE_RATE` of gross ticket revenue (env-configurable, default 10%); settlement calculator aggregates paid, non-cancelled bookings per organizer (optionally per event); payout lifecycle `pending → processing → paid` (or `failed`).
- Platform-wide revenue report.

### Platform-level hardening
- `express-rate-limit`: a global limiter (100 req/15 min), a stricter auth limiter (10 req/15 min), and a payment limiter (20 req/15 min) — `trust proxy` is enabled so limits key off the real client IP behind the ALB, not the ALB's own address.
- CORS is locked to an explicit allow-list built from `FRONTEND_URL` and known localhost origins.
- Security headers on every response: HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`.
- Cache-busting headers (`no-store`) on all API responses.
- Correlation ID middleware tags every request/response for log tracing.
- Structured JSON logging to `logs/app.log` and `logs/error.log`, shipped to CloudWatch Logs by the CloudWatch agent in production.

---

## Getting Started

### Prerequisites
- Node.js ≥ 22 (see `backend/package.json` → `engines`)
- MySQL 8+
- (Optional) AWS account for S3 PDF storage, Razorpay account for payments, Twilio account for SMS, Gmail (or other SMTP) app password for email

### Installation

```bash
# 1. Clone
git clone <repo-url>
cd Ticket-Booking-Application-2

# 2. Install backend dependencies
cd backend
npm install

# 3. Set up environment variables
# There is no .env.example in this repo — create backend/.env yourself using
# the variable list in "Environment Variables" below.

# 4. Start the server
npm run dev   # development (nodemon)
npm start     # production
```

On startup, the server automatically applies any pending Umzug migrations (starting from `db/master_schema.sql` as the baseline) — see [Database Setup](#database-setup). No manual `mysql < schema.sql` step is required as long as the database itself exists and the credentials in `.env` can create tables.

### Docker

```bash
docker-compose up --build
```

`docker-compose.yml` starts a MySQL 8.0 container and the backend container together, mapping the backend's HTTPS/HTTP ports to host `443`/`80`. The backend container expects TLS certs mounted at `./certs` (see `SSL_KEY_PATH` / `SSL_CERT_PATH` below) — generate local dev certs before running, or set `USE_HTTPS=false` to serve plain HTTP.

---

## Environment Variables

```env
# Runtime
NODE_ENV=development
PORT=3000

# Database (primary)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ticket_booking_db
DB_USER=root
DB_PASSWORD=your_password

# Database (read replica — optional; falls back to DB_HOST if unset)
DB_HOST_REPLICA=

# JWT — three independent secrets, one per token type
JWT_ACCESS_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_SESSION_SECRET=your_session_token_secret
JWT_SECRET=your_legacy_or_fallback_secret     # still read directly in a few places
QR_JWT_SECRET=your_qr_ticket_secret           # falls back to JWT_SECRET if unset

# Email (Gmail + App Password)
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password

# SMS (Twilio) — optional
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# AWS S3 (ticket/invoice PDF storage)
AWS_REGION=ap-south-1
S3_BUCKET_NAME=ticketverse-pdfs

# Frontend / CORS
FRONTEND_URL=https://yourdomain.com
APP_BASE_URL=https://yourdomain.com   # used to build links in SMS/emails; falls back to FRONTEND_URL

# HTTPS (local/dev only — the ALB terminates TLS in production)
USE_HTTPS=false
HTTPS_PORT=3000
HTTP_PORT=3001
SSL_KEY_PATH=./certs/server.key
SSL_CERT_PATH=./certs/server.crt

# Cookie security
COOKIE_SECURE=false   # set true in production (HTTPS-only cookies)

# Business rules (all optional — sane defaults shown)
CONVENIENCE_FEE_RATE=0.10
GST_RATE=0.09
CANCELLATION_FEE_RATE=0.05
CANCELLATION_FEE_GST_RATE=0.05
CANCELLATION_HIGH_TIER_CUTOFF_HOURS=72
PLATFORM_FEE_RATE=0.10
```

> **Note:** `DB_HOST`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` are required — `config/database.js` exits the process with a descriptive error if any are missing. All other variables have safe fallbacks or only gate optional integrations (S3, Twilio, Razorpay-dependent routes will simply fail at call time if unset).

---

## Database Setup

Schema management has two layers:

1. **`db/master_schema.sql`** — the full baseline schema (users, events, bookings, seats, categories, coupons, reviews, wishlists, waitlist, payouts, refresh tokens, cancellation policies, etc.). This is the single source of truth for a fresh database.
2. **Umzug migrations** (`backend/src/migrations/*.js`) — run automatically every time the server boots (`server.js`). The first migration loads `db/master_schema.sql` verbatim into an empty database; later migrations apply incremental, idempotent DDL changes (e.g. `00002-cancellation-policy-tiers.js` adds the `tiers` JSON column and backfills it from legacy columns if missing). Umzug tracks what has already run, so re-running on every boot is safe and a no-op once up to date.

For a manual/CI load instead of relying on the app's auto-migration (e.g. to seed a test database), load the baseline directly:

```bash
mysql -u root -p ticket_booking_db < db/master_schema.sql
```

`db/migration.sql` is kept as an incremental SQL reference alongside the JS migrations; it is not executed automatically.

In non-production environments, `server.js` also runs `sequelize.sync({ alter: true })` after migrations, for convenience during local development. This is intentionally skipped in production to avoid concurrent-boot DDL races across multiple ASG instances and schema drift from the reviewed migration files.

---

## API Reference

### Auth (`/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup-request` | Public | Send signup OTP |
| POST | `/auth/signup-verify` | Public | Verify OTP & create account |
| POST | `/auth/login-request` | Public | Send login OTP |
| POST | `/auth/login-verify` | Public | Verify OTP, issue access/refresh/session tokens |
| POST | `/auth/organizer-signup-request` | Public | Send organizer signup OTP |
| POST | `/auth/organizer-signup-verify` | Public | Verify OTP & create organizer account (pending approval) |
| POST | `/auth/refresh` | Cookie | Rotate refresh token, issue new access token |
| POST | `/auth/logout` | Auth | Revoke refresh token, clear cookies |
| GET | `/auth/me` | Auth | Get current user id/role |

### User Profile (`/user`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/user/profile` | Auth | Profile + booking summary |
| PUT | `/user/profile` | Auth | Update name, phone, bio |
| PUT | `/user/profile/password` | Auth | Change password |
| GET | `/user/profile/bookings` | Auth | Booking history |

### Events (`/events`) & Categories
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/events/featured` | Public | Featured events carousel |
| GET | `/events/trending` | Public | Trending events (30-day paid bookings) |
| GET | `/events` | Auth | All approved events |
| POST | `/events` | Admin | Create platform event (auto-approved) |
| PUT | `/events/:id` | Admin | Update event |
| DELETE | `/events/:id` | Admin | Delete event |
| GET | `/categories` | Public | Active categories |

### Search (`/search`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/search?q=` | Public | Full-text search across title/description/location/city |
| GET | `/search/events` | Public | Filtered search (city, category, price, date range) |
| GET | `/search/cities` | Public | Distinct list of cities with approved events |

### Seats (`/seats`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/seats/:eventId` | Auth | All seats for an event |
| GET | `/seats/:eventId/tiers` | Auth | Seat tier definitions |
| PUT | `/seats/:eventId/tiers` | Auth | Assign/update seat tiers (organizer/admin) |
| POST | `/seats/:eventId/hold` | Auth | Hold selected seats for 10 minutes |

### Bookings (`/bookings`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/bookings/my-bookings` | Auth | Current user's bookings |
| GET | `/bookings/:id/download-ticket` | Auth | Download PDF ticket |
| GET | `/bookings/:id/download-invoice` | Auth | Download PDF invoice |
| GET | `/bookings/:id/qr` | Auth | Get QR code for ticket |

### Payments (`/payments`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/create-order` | Auth | Create Razorpay order |
| POST | `/payments/verify` | Auth | Verify payment signature, confirm booking |

### Coupons (`/coupons`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/coupons/validate` | Public/Auth | Validate a coupon code against an order amount |
| POST | `/coupons` | Auth | Create coupon (admin) |
| GET | `/coupons` | Auth | List all coupons (admin) |
| PATCH | `/coupons/:id/status` | Auth | Activate/deactivate a coupon |

### Reviews (`/reviews`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/reviews/events/:eventId` | Auth | Submit a rating + review |
| GET | `/reviews/events/:eventId` | Public | List reviews for an event |
| GET | `/reviews/events/:eventId/summary` | Public | Aggregate rating summary |

### Wishlist (`/wishlist`) & Waitlist (`/waitlist`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/wishlist/:eventId` | Auth | Save event to wishlist |
| DELETE | `/wishlist/:eventId` | Auth | Remove from wishlist |
| GET | `/wishlist` | Auth | Current user's wishlist |
| POST | `/waitlist/:eventId` | Auth | Join event waitlist |
| DELETE | `/waitlist/:eventId` | Auth | Leave waitlist |
| GET | `/waitlist` | Auth | Current user's waitlist entries |
| GET | `/waitlist/:eventId/stats` | Public | Waitlist queue size for an event |

### Check-in (`/checkin`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/checkin` | Auth | Scan a ticket's QR token, mark attendee checked in |

### Cancellations (`/cancellations`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/cancellations/webhook/refund` | Public (webhook) | Razorpay refund webhook |
| GET | `/cancellations/preview/:bookingId` | Auth | Preview refund amount before cancelling |
| POST | `/cancellations/:bookingId` | Auth | Cancel a booking |
| GET | `/cancellations/:bookingId/download-invoice` | Auth | Download cancellation credit note |
| GET | `/cancellations/policy/:eventId` | Auth | Get cancellation policy for an event |
| PUT | `/cancellations/policy/:eventId` | Organizer | Create/update cancellation policy |

### Organizer (`/organizer`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET/PUT | `/organizer/profile` | Organizer | Business profile |
| GET | `/organizer/stats` | Organizer | Dashboard stats |
| GET/POST | `/organizer/events` | Organizer | List/create own events |
| PUT/DELETE | `/organizer/events/:id` | Organizer | Update/delete own event |
| GET | `/organizer/events/:id/attendees` | Organizer | Attendee list for an event |
| GET | `/organizer/revenue` | Organizer | Revenue breakdown |
| GET | `/organizer/payouts` | Organizer | Payout history & summary |
| POST | `/organizer/payouts/request` | Organizer | Request a payout |

### Admin (`/admin`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/moderation/events` | Admin | All events with status |
| GET | `/admin/moderation/events/pending` | Admin | Pending events |
| PUT | `/admin/moderation/events/:id/approve` | Admin | Approve event |
| PUT | `/admin/moderation/events/:id/reject` | Admin | Reject event |
| PUT | `/admin/events/:id/feature` | Admin | Toggle featured flag |
| GET | `/admin/payouts/data` | Admin | List all payouts |
| GET | `/admin/payouts/settlement/:organizerId` | Admin | Calculate outstanding settlement |
| POST | `/admin/payouts/create` | Admin | Create payout record |
| PUT | `/admin/payouts/:id/status` | Admin | Update payout status |
| GET/POST | `/admin/categories` | Admin | List/create categories |
| PUT/DELETE | `/admin/categories/:id` | Admin | Update/delete category |
| GET | `/organizer/admin/organizers` | Admin | List organizers |
| PUT | `/organizer/admin/organizers/:id/approve` | Admin | Approve organizer |
| PUT | `/organizer/admin/organizers/:id/reject` | Admin | Reject organizer |
| DELETE | `/organizer/admin/organizers/:id` | Admin | Delete organizer |

### Revenue (`/api`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/revenue` | Admin | Platform-wide revenue report (gross vs. effective, post-cancellation) |

---

## Frontend Pages

| URL | File | Role | Notes |
|---|---|---|---|
| `/` | `index.html` | Public | Login/Register |
| `/events-page` | `events.html` | User | Browse, Featured + Trending, search & filters |
| `/profile` | `user-profile.html` | User | Profile management |
| `/my-bookings` | `my-bookings.html` | User | Booking history, tickets, invoices |
| `/seat-selection` | `seat-selection.html` | User | Seat picker with tiers |
| `/payment` | `payment.html` | User | Checkout, coupon entry |
| `/wishlist-page` | `wishlist.html` | User | Saved events |
| `/organizer-register` | `organizer-register.html` | Public | Organizer signup |
| `/organizer-dashboard` | `organizer-dashboard.html` | Organizer | Dashboard stats |
| `/organizer-events` | `organizer-events.html` | Organizer | Event management, seat tiers |
| `/organizer-cancellation-policy` | `organizer-cancellation-policy.html` | Organizer | Refund tier editor |
| `/organizer-revenue` | `organizer-revenue.html` | Organizer | Revenue charts |
| `/organizer-payouts` | `organizer-payouts.html` | Organizer | Payout history |
| `/organizer/checkin` | `checkin.html` | Organizer | QR ticket scanner |
| `/admin` | `admin-dashboard.html` | Admin | Platform overview |
| `/admin/organizers` | `admin-organizers.html` | Admin | Organizer approvals |
| `/admin/moderation` | `admin-moderation.html` | Admin | Event moderation |
| `/admin/payouts` | `admin-payouts.html` | Admin | Payout management |
| `/admin/revenue` | `admin-revenue.html` | Admin | Platform revenue |
| `/admin/categories/manage` | `admin-categories.html` | Admin | Category CRUD |
| `/admin/coupons` | `admin-coupons.html` | Admin | Coupon CRUD |

---

## Testing

```bash
cd backend
npm test   # jest --runInBand --forceExit
```

The Jest suite (`backend/src/__tests__/`) covers booking creation, cancellation/refund math, seat holding, payment order/signature handling, database connectivity, and the `/health` endpoint. Dependencies (Sequelize models, Razorpay SDK) are mocked via `jest.isolateModules` + `jest.mock`, so tests run without a live database except `db.test.js` and `health.test.js`. The CI workflow (`.github/workflows/docker-build.yml`) provisions a real MySQL 8.0 service container and loads `db/master_schema.sql` before running the suite.

---

## Deployment

The `terraform/` directory provisions:

- **VPC** — 2 public + 2 private subnets, NAT gateway.
- **RDS MySQL** — Multi-AZ primary (`db.t3.micro`, 20→100 GB gp3 autoscaling, 7-day backups, deletion protection) plus a dedicated **read replica** (also `db.t3.micro`) intended for GET-heavy routes (events/reviews/search).
- **EC2 Auto Scaling Group** — private-subnet instances (min 1 / desired 1 / max 3) running the backend as a Docker container via `user_data.sh`, target-tracking scaling on both CPU (60%) and ALB requests-per-target (800), with a rolling `instance_refresh` on launch-template changes.
- **Application Load Balancer** — public subnets, HTTP→HTTPS redirect, HTTPS listener using a **self-signed certificate uploaded to IAM** (`aws_iam_server_certificate`) rather than ACM — the app URL is reachable immediately without owning a domain, at the cost of a one-time browser certificate warning.
- **S3** — bucket for ticket PDFs and invoices, SSE-AES256 encrypted, public access fully blocked, lifecycle rules expiring tickets after 365 days and invoices after ~7 years (2555 days).
- **IAM** — a scoped EC2 instance role (ECR pull, SSM Core, CloudWatch agent, S3 read/write limited to `tickets/*` and `invoices/*`), and a separate GitHub Actions OIDC role (no long-lived AWS keys) scoped to ECR push + SSM `SendCommand` against this project's instances only.
- **CloudWatch** — log groups for app/error/bootstrap logs, alarms for ALB 5xx and unhealthy-host count, EC2 high CPU, RDS CPU/storage/connections and replica lag, metric filters + alarms on payment errors, and a summary dashboard.

### CI/CD

`.github/workflows/docker-build.yml`:
1. **checks** — fails fast on unresolved merge-conflict markers anywhere in the repo.
2. **test** — spins up a MySQL 8.0 service container, loads `db/master_schema.sql`, installs backend deps, runs `npm test`.
3. **deploy** (manual `workflow_dispatch` only) — authenticates to AWS via GitHub OIDC, builds and pushes the Docker image to ECR tagged both `:latest` and with the commit SHA, then rolls it out to every running instance in the ASG via **SSM `RunShellScript`** (pull image → replace the `ticket-backend` container), rather than an ECS/Fargate-style task-definition deploy.

### Docker (local)

```bash
docker-compose up --build
```

`docker-compose.yml` starts the backend and a MySQL 8.0 container wired together on one network, with the backend's HTTPS/HTTP ports mapped to host `443`/`80`.

---

## License

ISC
