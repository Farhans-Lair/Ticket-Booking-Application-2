TicketVerse — Ticket Booking Application
A full-stack event ticketing platform built with Node.js / Express (backend) and vanilla HTML/CSS/JS (frontend), backed by MySQL via Sequelize ORM.
---
Table of Contents
Project Overview
Architecture
Features
New Features (v2)
Getting Started
Environment Variables
Database Setup
API Reference
Frontend Pages
Deployment
---
Project Overview
TicketVerse is a multi-role ticketing platform supporting:
Role	Capabilities
User	Browse events, book tickets, manage profile, view bookings/reminders
Organizer	Create & manage events (subject to admin approval), view revenue & payouts
Admin	Moderate events, manage organizers, process payouts, feature events
---
Architecture
```
Ticket-Booking-Application/
├── backend/
│   └── src/
│       ├── app.js                    # Express app, routes, middleware
│       ├── server.js                 # HTTP/HTTPS server bootstrap
│       ├── config/                   # DB, logger, S3 config
│       ├── controllers/              # Route handlers
│       │   ├── admin.controllers.js  # ✨ Moderation + Payouts
│       │   ├── user.controllers.js   # ✨ User profile
│       │   ├── event.controllers.js  # ✨ Featured/Trending
│       │   ├── organizer.controllers.js
│       │   ├── auth.controllers.js
│       │   ├── booking.controllers.js
│       │   ├── payment.controllers.js
│       │   └── cancellation.controllers.js
│       ├── services/
│       │   ├── reminder.services.js  # ✨ Event reminder emails (cron)
│       │   ├── payout.services.js    # ✨ Organizer settlements
│       │   ├── event.services.js     # ✨ Featured/Trending/Moderation
│       │   ├── email.services.js
│       │   ├── booking.services.js
│       │   ├── auth.services.js
│       │   └── organizer.services.js
│       ├── models/
│       │   ├── User.js               # ✨ + phone, avatar_url, bio
│       │   ├── Event.js              # ✨ + is_featured, status, moderation fields
│       │   ├── Payout.js             # ✨ New model
│       │   ├── Booking.js
│       │   ├── OrganizerProfile.js
│       │   ├── CancellationPolicy.js
│       │   ├── Seat.js
│       │   └── index.js              # ✨ Payout associations added
│       ├── routes/
│       │   ├── user.routes.js        # ✨ New — user profile endpoints
│       │   ├── admin.routes.js       # ✨ + moderation & payout API routes
│       │   ├── event.routes.js       # ✨ + /featured, /trending
│       │   ├── organizer.routes.js   # ✨ + /payouts
│       │   └── ...
│       └── middleware/
├── frontend/
│   ├── user-profile.html             # ✨ New
│   ├── admin-moderation.html         # ✨ New
│   ├── admin-payouts.html            # ✨ New
│   ├── organizer-payouts.html        # ✨ New
│   ├── events.html                   # ✨ Updated — Featured & Trending
│   ├── index.html                    # Login / Register
│   ├── admin-dashboard.html
│   ├── admin-revenue.html
│   ├── admin-organizers.html
│   ├── organizer-dashboard.html
│   ├── organizer-events.html
│   ├── organizer-revenue.html
│   ├── my-bookings.html
│   └── ...
├── db/
│   ├── schema.sql                    # Base schema
│   ├── features_migration.sql        # ✨ Migration for all v2 features
│   ├── cancellation_migration.sql
│   ├── invoice_migration.sql
│   └── organizer_migration.sql
└── terraform/                        # AWS infrastructure (EC2 + RDS + ALB)
```
---
Features
Core (v1)
OTP-based authentication (email verification for signup & login)
Multi-role system: user / organizer / admin
Event management (CRUD by admin; organizer scope-limited)
Seat selection with real-time seat locking
Razorpay payment integration
PDF ticket & invoice generation (S3 storage)
Booking cancellation with tiered refund policies
Organizer registration & admin approval workflow
Revenue reporting per-organizer and platform-wide
---
New Features (v2)
1. 👤 User Profile Page
Endpoint: `GET/PUT /user/profile`, `PUT /user/profile/password`, `GET /user/profile/bookings`
Users can now:
View and edit their name, phone number, and bio
See a booking summary (total / active / cancelled)
Change their password securely (bcrypt re-hash)
Browse full booking history with event details
Frontend: `/profile` → `frontend/user-profile.html`
DB change: `users` table gains `phone`, `avatar_url`, `bio`, `updated_at` columns (see `features_migration.sql`).
---
2. ⭐ Featured / Trending Events
Endpoints:
`GET /events/featured` — returns admin-curated featured events (no auth required)
`GET /events/trending` — returns events with most paid bookings in last 30 days (no auth required)
`PUT /api/admin/events/:id/feature` — admin toggles `is_featured` flag
Business logic:
Featured events require admin action; they appear in the homepage carousel.
Trending is computed dynamically from booking volume over the rolling 30-day window.
Both queries only return approved events with future dates.
Frontend: `events.html` now shows a scrollable featured carousel and trending grid above the full event list, with category filters and search.
DB change: `events` gains `is_featured TINYINT(1)`.
---
3. ⏰ Event Reminder Emails
Service: `backend/src/services/reminder.services.js`
A node-cron scheduler fires every day at 09:00 and:
Finds all approved events starting within the next 24 hours.
Finds paid, active bookings for those events where `reminder_sent = 0`.
Sends a styled HTML reminder email via Nodemailer.
Sets `reminder_sent = 1` on each booking to prevent duplicate sends.
No additional API endpoint needed — the scheduler runs automatically on server start. To trigger manually in dev, call `sendEventReminders()` directly.
DB change: `bookings` gains `reminder_sent TINYINT(1) DEFAULT 0`.
Dependency added: `node-cron ^3.0.3`
---
4. 🛡️ Event Moderation by Admin
Endpoints:
`GET  /api/admin/moderation/events`      — list pending events
`GET  /api/admin/moderation/events/all`  — list all events with status
`PUT  /api/admin/moderation/events/:id/approve` — approve event (body: `{ note? }`)
`PUT  /api/admin/moderation/events/:id/reject`  — reject event (body: `{ note }`)
Business logic:
Admin-created events: `status = 'approved'` automatically (no review needed).
Organizer-created events: `status = 'pending'` on creation — invisible to public until approved.
Rejected events show `moderation_note` to help organizers resubmit.
The `GET /events` public endpoint filters to `status = 'approved'` only.
Frontend: `/admin/moderation` → `frontend/admin-moderation.html`
Stats cards (pending / approved / rejected / total)
Per-status filter tabs
Approve / Reject buttons with reason modal
Feature toggle per event
DB change: `events` gains `status ENUM('pending','approved','rejected')`, `moderation_note`, `moderated_at`, `moderated_by`.
---
5. 💳 Organizer Payout / Settlement
Admin endpoints:
`GET  /api/admin/payouts`                           — list all payouts (filter by organizer, status)
`GET  /api/admin/payouts/settlement/:organizerId`   — calculate outstanding settlement
`POST /api/admin/payouts`                           — create payout record
`PUT  /api/admin/payouts/:id/status`                — mark processing / paid / failed
Organizer endpoint:
`GET  /organizer/payouts` — view own payout history + summary totals
Business logic:
Platform fee = 10% of gross ticket revenue (configurable via `PLATFORM_FEE_RATE` constant).
`net_amount = gross - platform_fee` stored on each payout record.
Settlement calculator aggregates all paid, non-cancelled bookings for an organizer (optionally scoped to one event).
Payout lifecycle: `pending → processing → paid` (or `failed`).
Frontend:
`/admin/payouts` → `frontend/admin-payouts.html` (admin: create + track all payouts)
`/organizer-payouts` → `frontend/organizer-payouts.html` (organizer: read-only history)
DB change: New `payouts` table (see `features_migration.sql`).
---
Getting Started
Prerequisites
Node.js ≥ 18
MySQL 8+
(Optional) AWS account for S3 PDF storage
Installation
```bash
# 1. Clone
git clone <repo-url>
cd Ticket-Booking-Application

# 2. Install backend dependencies
cd backend
npm install

# 3. Set up environment variables
cp .env.example .env
# edit .env — see Environment Variables section below

# 4. Run database migrations
mysql -u root -p your_db < db/schema.sql
mysql -u root -p your_db < db/organizer_migration.sql
mysql -u root -p your_db < db/cancellation_migration.sql
mysql -u root -p your_db < db/invoice_migration.sql
mysql -u root -p your_db < db/features_migration.sql   # ✨ v2

# 5. Start the server
npm run dev   # development (nodemon)
npm start     # production
```
---
Environment Variables
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ticketverse
DB_USER=root
DB_PASS=your_password

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Email (Gmail + App Password)
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# AWS S3 (optional)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_BUCKET_NAME=ticketverse-pdfs

# Frontend / CORS
FRONTEND_URL=https://yourdomain.com
HTTPS_PORT=3000
HTTP_PORT=3001

# Cookie security
COOKIE_SECURE=true   # set false for local HTTP dev
```
---
Database Setup
Run migrations in order:
File	Purpose
`db/schema.sql`	Core tables: users, events, bookings, seats
`db/organizer_migration.sql`	organizer_profiles table
`db/cancellation_migration.sql`	Cancellation columns on bookings
`db/invoice_migration.sql`	S3 invoice key columns
`db/features_migration.sql`	✨ v2 — profile, featured, status, reminders, payouts
---
API Reference
Auth
Method	Path	Auth	Description
POST	`/auth/signup-request`	Public	Send signup OTP
POST	`/auth/signup-verify`	Public	Verify OTP & create account
POST	`/auth/login-request`	Public	Send login OTP
POST	`/auth/login-verify`	Public	Verify OTP & issue JWT
POST	`/auth/logout`	Auth	Clear session
GET	`/auth/me`	Auth	Get current user info
User Profile ✨
Method	Path	Auth	Description
GET	`/user/profile`	Auth	Get profile + booking summary
PUT	`/user/profile`	Auth	Update name, phone, bio
PUT	`/user/profile/password`	Auth	Change password
GET	`/user/profile/bookings`	Auth	Booking history
Events
Method	Path	Auth	Description
GET	`/events/featured`	Public	✨ Featured events carousel
GET	`/events/trending`	Public	✨ Trending events
GET	`/events`	Auth	All approved events
POST	`/events`	Admin	Create platform event
PUT	`/events/:id`	Admin	Update event
DELETE	`/events/:id`	Admin	Delete event
Event Moderation ✨
Method	Path	Auth	Description
GET	`/api/admin/moderation/events`	Admin	Pending events
GET	`/api/admin/moderation/events/all`	Admin	All events with status
PUT	`/api/admin/moderation/events/:id/approve`	Admin	Approve event
PUT	`/api/admin/moderation/events/:id/reject`	Admin	Reject event
PUT	`/api/admin/events/:id/feature`	Admin	Toggle featured flag
Organizer
Method	Path	Auth	Description
GET	`/organizer/profile`	Organizer	Business profile
PUT	`/organizer/profile`	Organizer	Update profile
GET	`/organizer/events`	Organizer	Own events (all statuses)
POST	`/organizer/events`	Organizer	Submit event (→ pending review)
PUT	`/organizer/events/:id`	Organizer	Update own event
DELETE	`/organizer/events/:id`	Organizer	Delete own event
GET	`/organizer/revenue`	Organizer	Revenue breakdown
GET	`/organizer/payouts`	Organizer	✨ Payout history & summary
Payouts ✨
Method	Path	Auth	Description
GET	`/api/admin/payouts`	Admin	List all payouts
GET	`/api/admin/payouts/settlement/:organizerId`	Admin	Calculate outstanding amount
POST	`/api/admin/payouts`	Admin	Create payout record
PUT	`/api/admin/payouts/:id/status`	Admin	Update payout status
---
Frontend Pages
URL	File	Role	Feature
`/`	`index.html`	Public	Login/Register
`/events-page`	`events.html` ✨	User	Browse events + Featured + Trending
`/profile`	`user-profile.html` ✨	User	Profile management
`/my-bookings`	`my-bookings.html`	User	Booking history
`/seat-selection`	`seat-selection.html`	User	Seat picker
`/payment`	`payment.html`	User	Checkout
`/organizer-register`	`organizer-register.html`	Public	Organizer signup
`/organizer-dashboard`	`organizer-dashboard.html`	Organizer	Dashboard stats
`/organizer-events`	`organizer-events.html`	Organizer	Event management
`/organizer-revenue`	`organizer-revenue.html`	Organizer	Revenue charts
`/organizer-payouts`	`organizer-payouts.html` ✨	Organizer	Payout history
`/admin`	`admin-dashboard.html`	Admin	Platform overview
`/admin/organizers`	`admin-organizers.html`	Admin	Organizer approvals
`/admin/moderation`	`admin-moderation.html` ✨	Admin	Event moderation
`/admin/payouts`	`admin-payouts.html` ✨	Admin	Payout management
`/admin/revenue`	`admin-revenue.html`	Admin	Platform revenue
---
Deployment
The `terraform/` directory provisions the following AWS resources:
VPC with public/private subnets
RDS MySQL (private subnet)
EC2 Auto Scaling Group behind an Application Load Balancer
S3 bucket for PDF assets (tickets, invoices)
CloudWatch alarms and log groups
IAM roles for EC2 ↔ S3 access
Docker
```bash
docker-compose up --build
```
The `docker-compose.yml` starts the backend and a MySQL container wired together.
---
License
ISC
