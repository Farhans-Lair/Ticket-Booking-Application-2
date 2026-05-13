-- ============================================================
-- TICKETVERSE — COMPLETE MASTER SCHEMA
-- Compatible with MySQL 5.7 and MySQL 8.0+
-- Run this on a fresh / empty database.
-- Usage:
--   mysql -u root -p ticket_booking_db < master_schema.sql
-- OR inside mysql client:
--   USE ticket_booking_db;
--   SOURCE /path/to/master_schema.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS payouts;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS seats;
DROP TABLE IF EXISTS cancellation_policies;
DROP TABLE IF EXISTS organizer_profiles;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ──────────────────────────────────────────────
-- 1. USERS
--    Includes: profile fields (phone, avatar_url, bio)
-- ──────────────────────────────────────────────
CREATE TABLE users (
  id            INT           NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  password_hash TEXT          NOT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'user',

  -- Feature: User Profile
  phone         VARCHAR(20)   DEFAULT NULL,
  avatar_url    VARCHAR(512)  DEFAULT NULL,
  bio           TEXT          DEFAULT NULL,

  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ──────────────────────────────────────────────
-- 2. EVENTS
--    Includes: is_featured, status (moderation),
--              moderation fields, organizer_id
-- ──────────────────────────────────────────────
CREATE TABLE events (
  id                 INT           NOT NULL AUTO_INCREMENT,
  organizer_id       INT           DEFAULT NULL,        -- NULL = platform (admin) event
  title              VARCHAR(200)  NOT NULL,
  description        TEXT          DEFAULT NULL,
  location           VARCHAR(150)  DEFAULT NULL,
  event_date         DATETIME      NOT NULL,

  -- Price: 0 means tier-based pricing (price set per seat)
  price              DECIMAL(10,2) NOT NULL DEFAULT 0.00,

  total_tickets      INT           NOT NULL,
  available_tickets  INT           NOT NULL,

  category           ENUM(
                       'Music','Sports','Comedy','Theatre',
                       'Conference','Festival','Workshop','Other'
                     )             NOT NULL DEFAULT 'Other',

  -- Feature: Featured / Trending
  is_featured        TINYINT(1)    NOT NULL DEFAULT 0,

  -- Feature: Event Moderation
  -- 'approved' = visible publicly
  -- 'pending'  = organizer submitted, awaiting admin review
  -- 'rejected' = admin rejected
  status             ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  moderation_note    TEXT          DEFAULT NULL,
  moderated_at       DATETIME      DEFAULT NULL,
  moderated_by       INT           DEFAULT NULL,        -- admin user id

  images             LONGTEXT      DEFAULT NULL,        -- JSON array of base64 strings

  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_events_organizer (organizer_id),
  KEY idx_events_status    (status),
  KEY idx_events_featured  (is_featured),
  CONSTRAINT fk_events_organizer
    FOREIGN KEY (organizer_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_events_moderated_by
    FOREIGN KEY (moderated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ──────────────────────────────────────────────
-- 3. SEATS
--    Includes: seat_tier, tier_price
--    (Fix Issue 4: tier-based pricing)
-- ──────────────────────────────────────────────
CREATE TABLE seats (
  id           INT           NOT NULL AUTO_INCREMENT,
  event_id     INT           NOT NULL,
  seat_number  VARCHAR(10)   NOT NULL,

  -- Feature: Seat Tiers
  seat_tier    VARCHAR(50)   NOT NULL DEFAULT 'General',
  tier_price   DECIMAL(10,2) NOT NULL DEFAULT 0.00,

  status       ENUM('available','booked') NOT NULL DEFAULT 'available',

  PRIMARY KEY (id),
  UNIQUE KEY uq_seat_event (event_id, seat_number),
  KEY idx_seats_event  (event_id),
  KEY idx_seats_status (status),
  CONSTRAINT fk_seats_event
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ──────────────────────────────────────────────
-- 4. ORGANIZER PROFILES
-- ──────────────────────────────────────────────
CREATE TABLE organizer_profiles (
  id               INT           NOT NULL AUTO_INCREMENT,
  user_id          INT           NOT NULL,
  business_name    VARCHAR(200)  DEFAULT NULL,
  contact_phone    VARCHAR(20)   DEFAULT NULL,
  gst_number       VARCHAR(20)   DEFAULT NULL,
  address          TEXT          DEFAULT NULL,
  status           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  rejection_reason TEXT          DEFAULT NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_organizer_user (user_id),
  CONSTRAINT fk_organizer_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ──────────────────────────────────────────────
-- 5. BOOKINGS
--    Includes: reminder_sent, cancellation fields,
--              invoice S3 keys
-- ──────────────────────────────────────────────
CREATE TABLE bookings (
  id                      INT           NOT NULL AUTO_INCREMENT,
  user_id                 INT           NOT NULL,
  event_id                INT           NOT NULL,
  tickets_booked          INT           NOT NULL,
  selected_seats          TEXT          DEFAULT NULL,   -- JSON array of seat numbers

  -- Revenue breakdown
  ticket_amount           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  convenience_fee         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  gst_amount              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_paid              DECIMAL(10,2) NOT NULL DEFAULT 0.00,

  -- Payment
  razorpay_order_id       VARCHAR(100)  DEFAULT NULL,
  razorpay_payment_id     VARCHAR(100)  DEFAULT NULL,
  payment_status          ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',

  -- Feature: Event Reminder Emails
  reminder_sent           TINYINT(1)    NOT NULL DEFAULT 0,

  -- Cancellation fields
  cancellation_status     VARCHAR(30)   NOT NULL DEFAULT 'active',
  cancellation_reason     TEXT          DEFAULT NULL,
  cancellation_fee        DECIMAL(10,2) DEFAULT NULL,
  cancellation_fee_gst    DECIMAL(10,2) DEFAULT NULL,
  refund_amount           DECIMAL(10,2) DEFAULT NULL,
  cancelled_at            DATETIME      DEFAULT NULL,

  -- S3 PDF keys
  ticket_pdf_s3_key       VARCHAR(512)  DEFAULT NULL,
  booking_invoice_s3_key  VARCHAR(512)  DEFAULT NULL,

  booking_date            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_bookings_user    (user_id),
  KEY idx_bookings_event   (event_id),
  KEY idx_bookings_payment (payment_status),
  KEY idx_bookings_reminder (reminder_sent),
  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_event
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ──────────────────────────────────────────────
-- 6. CANCELLATION POLICIES
-- ──────────────────────────────────────────────
CREATE TABLE cancellation_policies (
  id                         INT           NOT NULL AUTO_INCREMENT,
  event_id                   INT           NOT NULL,
  organizer_id               INT           NOT NULL,

  -- Refund tiers (hours before event → refund %)
  tier1_hours_before         INT           DEFAULT 72,
  tier1_refund_percent       DECIMAL(5,2)  DEFAULT 100.00,

  tier2_hours_before         INT           DEFAULT 24,
  tier2_refund_percent       DECIMAL(5,2)  DEFAULT 50.00,

  tier3_hours_before         INT           DEFAULT 0,
  tier3_refund_percent       DECIMAL(5,2)  DEFAULT 0.00,

  -- Flat cancellation fee added on top
  cancellation_fee_flat      DECIMAL(10,2) DEFAULT 0.00,
  cancellation_fee_percent   DECIMAL(5,2)  DEFAULT 0.00,

  allow_cancellation         TINYINT(1)    NOT NULL DEFAULT 1,
  notes                      TEXT          DEFAULT NULL,

  created_at                 TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_cancellation_event (event_id),
  KEY idx_cancellation_organizer (organizer_id),
  CONSTRAINT fk_cancellation_event
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
  CONSTRAINT fk_cancellation_organizer
    FOREIGN KEY (organizer_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ──────────────────────────────────────────────
-- 7. PAYOUTS
--    Includes: requested_by, request_note (organizer
--    payout request flow — Fix Issues 1 & 5)
-- ──────────────────────────────────────────────
CREATE TABLE payouts (
  id               INT            NOT NULL AUTO_INCREMENT,
  organizer_id     INT            NOT NULL,
  event_id         INT            DEFAULT NULL,

  amount           DECIMAL(12,2)  NOT NULL,               -- gross ticket revenue
  platform_fee     DECIMAL(12,2)  NOT NULL DEFAULT 0.00,  -- 10% of amount
  net_amount       DECIMAL(12,2)  NOT NULL,               -- amount - platform_fee

  currency         VARCHAR(10)    NOT NULL DEFAULT 'INR',

  -- pending    = created / requested, not yet processed
  -- processing = transfer initiated by admin
  -- paid       = funds received by organizer
  -- failed     = transfer failed
  status           ENUM('pending','processing','paid','failed') NOT NULL DEFAULT 'pending',

  payment_method   VARCHAR(50)    DEFAULT NULL,   -- bank_transfer | upi | razorpay | cheque
  reference_id     VARCHAR(255)   DEFAULT NULL,   -- UTR / UPI txn / cheque number

  notes            TEXT           DEFAULT NULL,

  -- Admin who processed this payout
  initiated_by     INT            DEFAULT NULL,

  -- Organizer who requested this payout (NULL = admin-initiated)
  requested_by     INT            DEFAULT NULL,
  request_note     TEXT           DEFAULT NULL,
  requested_at     DATETIME       DEFAULT NULL,

  paid_at          DATETIME       DEFAULT NULL,

  created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_payouts_organizer (organizer_id, status),
  KEY idx_payouts_event     (event_id),
  KEY idx_payouts_status    (status),
  CONSTRAINT fk_payout_organizer
    FOREIGN KEY (organizer_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_payout_event
    FOREIGN KEY (event_id)     REFERENCES events (id) ON DELETE SET NULL,
  CONSTRAINT fk_payout_initiated_by
    FOREIGN KEY (initiated_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_payout_requested_by
    FOREIGN KEY (requested_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ──────────────────────────────────────────────
-- VERIFY
-- ──────────────────────────────────────────────
SELECT
  TABLE_NAME                         AS `Table`,
  TABLE_ROWS                         AS `Rows`,
  ROUND(DATA_LENGTH/1024,1)          AS `Data KB`
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;
