-- ============================================================
-- TICKETVERSE — SINGLE CONSOLIDATED MIGRATION
-- Upgrades any existing database to the current schema.
--
-- Run this on a LIVE database that was set up before master_schema.sql
-- was created (i.e. any database that ran schema.sql + individual
-- migration files in the past).
--
-- ✅ Safe to run multiple times — every statement uses
--    IF NOT EXISTS / IF EXISTS / MODIFY guards so re-running
--    on an already-migrated database causes zero errors.
--
-- DO NOT run this on a fresh database — use master_schema.sql instead.
--
-- Usage:
--   mysql -u root -p ticket_booking_db < db/migration.sql
-- ============================================================


-- ============================================================
-- SECTION 1 — USERS
-- (from features_migration.sql)
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone       VARCHAR(20)   DEFAULT NULL  AFTER email,
  ADD COLUMN IF NOT EXISTS avatar_url  VARCHAR(512)  DEFAULT NULL  AFTER phone,
  ADD COLUMN IF NOT EXISTS bio         TEXT          DEFAULT NULL  AFTER avatar_url,
  ADD COLUMN IF NOT EXISTS bank_details JSON         DEFAULT NULL  AFTER bio,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP AFTER created_at;


-- ============================================================
-- SECTION 2 — ORGANIZER PROFILES
-- (from organizer_migration.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS organizer_profiles (
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


-- ============================================================
-- SECTION 3 — EVENTS
-- (from organizer_migration, features_migration, migration-features-1-9)
-- ============================================================

-- Add organizer_id if missing (original schema.sql didn't have it)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS organizer_id   INT           DEFAULT NULL  AFTER id;

-- Add FK for organizer_id only if not already present
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'events'
    AND CONSTRAINT_NAME = 'fk_events_organizer'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE events ADD CONSTRAINT fk_events_organizer FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Featured / trending
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_featured     TINYINT(1)    NOT NULL DEFAULT 0  AFTER category;

-- Moderation
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS status          ENUM('pending','approved','rejected')
                                           NOT NULL DEFAULT 'approved'        AFTER is_featured,
  ADD COLUMN IF NOT EXISTS moderation_note TEXT          DEFAULT NULL         AFTER status,
  ADD COLUMN IF NOT EXISTS moderated_at    DATETIME      DEFAULT NULL         AFTER moderation_note,
  ADD COLUMN IF NOT EXISTS moderated_by    INT           DEFAULT NULL         AFTER moderated_at;

-- Fix FK for moderated_by
SET @fk2 = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'events'
    AND CONSTRAINT_NAME = 'fk_events_moderated_by'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql2 = IF(@fk2 = 0,
  'ALTER TABLE events ADD CONSTRAINT fk_events_moderated_by FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- Category: ENUM → VARCHAR (allows dynamic categories)
ALTER TABLE events
  MODIFY COLUMN category VARCHAR(100) NOT NULL DEFAULT 'Other';

-- Feature 2: City + search indexes
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS city           VARCHAR(100)  DEFAULT NULL          AFTER location;

-- Feature 5: Cached rating
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,1)  DEFAULT NULL          AFTER city,
  ADD COLUMN IF NOT EXISTS review_count   INT           NOT NULL DEFAULT 0    AFTER average_rating;

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_events_city  ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_price ON events(price);
CREATE INDEX IF NOT EXISTS idx_events_date  ON events(event_date);


-- ============================================================
-- SECTION 4 — SEATS
-- (from seat_tiers_migration.sql, migration-features-1-9.sql)
-- ============================================================

-- Seat tiers
ALTER TABLE seats
  ADD COLUMN IF NOT EXISTS seat_tier  VARCHAR(50)   NOT NULL DEFAULT 'General' AFTER seat_number,
  ADD COLUMN IF NOT EXISTS tier_price DECIMAL(10,2) NOT NULL DEFAULT 0.00      AFTER seat_tier;

-- Feature 1: Seat hold — extend ENUM to include 'held'
ALTER TABLE seats
  MODIFY COLUMN status ENUM('available','booked','held') NOT NULL DEFAULT 'available';

-- Feature 1: Hold columns
ALTER TABLE seats
  ADD COLUMN IF NOT EXISTS held_until       DATETIME DEFAULT NULL AFTER status,
  ADD COLUMN IF NOT EXISTS held_by_user_id  INT      DEFAULT NULL AFTER held_until;

-- Hold index
CREATE INDEX IF NOT EXISTS idx_seats_held ON seats(status, held_until);


-- ============================================================
-- SECTION 5 — BOOKINGS
-- (from cancellation_migration, invoice_migration,
--  seat_tiers_migration, migration-features-1-9)
-- ============================================================

-- Reminder flag
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_sent           TINYINT(1)    NOT NULL DEFAULT 0    AFTER payment_status;

-- Cancellation fields
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancellation_status     VARCHAR(30)   NOT NULL DEFAULT 'active' AFTER reminder_sent,
  ADD COLUMN IF NOT EXISTS cancellation_reason     TEXT          DEFAULT NULL              AFTER cancellation_status,
  ADD COLUMN IF NOT EXISTS cancellation_fee        DECIMAL(10,2) DEFAULT NULL              AFTER cancellation_reason,
  ADD COLUMN IF NOT EXISTS cancellation_fee_gst    DECIMAL(10,2) DEFAULT NULL              AFTER cancellation_fee,
  ADD COLUMN IF NOT EXISTS applied_tier_hours      INT           DEFAULT NULL              AFTER cancellation_fee_gst,
  ADD COLUMN IF NOT EXISTS refund_amount           DECIMAL(10,2) DEFAULT NULL              AFTER applied_tier_hours,
  ADD COLUMN IF NOT EXISTS razorpay_refund_id      VARCHAR(255)  DEFAULT NULL              AFTER refund_amount,
  ADD COLUMN IF NOT EXISTS cancelled_at            DATETIME      DEFAULT NULL              AFTER razorpay_refund_id;

-- S3 PDF keys
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS ticket_pdf_s3_key           VARCHAR(512) DEFAULT NULL AFTER cancelled_at,
  ADD COLUMN IF NOT EXISTS booking_invoice_s3_key      VARCHAR(512) DEFAULT NULL AFTER ticket_pdf_s3_key,
  ADD COLUMN IF NOT EXISTS cancellation_invoice_s3_key VARCHAR(512) DEFAULT NULL AFTER booking_invoice_s3_key;

-- Feature 3: QR check-in
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS qr_token      TEXT        DEFAULT NULL AFTER cancellation_invoice_s3_key,
  ADD COLUMN IF NOT EXISTS checked_in    TINYINT(1)  NOT NULL DEFAULT 0 AFTER qr_token,
  ADD COLUMN IF NOT EXISTS checked_in_at DATETIME    DEFAULT NULL AFTER checked_in;

-- Feature 4: Coupon discount
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS coupon_code     VARCHAR(50)   DEFAULT NULL           AFTER checked_in_at,
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00  AFTER coupon_code;

-- Cancellation status index
CREATE INDEX IF NOT EXISTS idx_bookings_cancel ON bookings(cancellation_status);


-- ============================================================
-- SECTION 6 — CANCELLATION POLICIES
-- (from cancellation_migration.sql — migrated to flat columns)
-- ============================================================

CREATE TABLE IF NOT EXISTS cancellation_policies (
  id                         INT           NOT NULL AUTO_INCREMENT,
  event_id                   INT           NOT NULL,
  organizer_id               INT           NOT NULL,
  tier1_hours_before         INT           DEFAULT 72,
  tier1_refund_percent       DECIMAL(5,2)  DEFAULT 100.00,
  tier2_hours_before         INT           DEFAULT 24,
  tier2_refund_percent       DECIMAL(5,2)  DEFAULT 50.00,
  tier3_hours_before         INT           DEFAULT 0,
  tier3_refund_percent       DECIMAL(5,2)  DEFAULT 0.00,
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
    FOREIGN KEY (event_id)     REFERENCES events (id) ON DELETE CASCADE,
  CONSTRAINT fk_cancellation_organizer
    FOREIGN KEY (organizer_id) REFERENCES users  (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- SECTION 7 — PAYOUTS
-- (from features_migration.sql + seat_tiers_migration.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS payouts (
  id               INT            NOT NULL AUTO_INCREMENT,
  organizer_id     INT            NOT NULL,
  event_id         INT            DEFAULT NULL,
  amount           DECIMAL(12,2)  NOT NULL,
  platform_fee     DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  net_amount       DECIMAL(12,2)  NOT NULL,
  currency         VARCHAR(10)    NOT NULL DEFAULT 'INR',
  status           ENUM('pending','processing','paid','failed') NOT NULL DEFAULT 'pending',
  payment_method   VARCHAR(50)    DEFAULT NULL,
  reference_id     VARCHAR(255)   DEFAULT NULL,
  notes            TEXT           DEFAULT NULL,
  initiated_by     INT            DEFAULT NULL,
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
    FOREIGN KEY (organizer_id) REFERENCES users  (id) ON DELETE CASCADE,
  CONSTRAINT fk_payout_event
    FOREIGN KEY (event_id)     REFERENCES events (id) ON DELETE SET NULL,
  CONSTRAINT fk_payout_initiated_by
    FOREIGN KEY (initiated_by) REFERENCES users  (id) ON DELETE SET NULL,
  CONSTRAINT fk_payout_requested_by
    FOREIGN KEY (requested_by) REFERENCES users  (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- SECTION 8 — EVENT CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS event_categories (
  id          INT           NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)  NOT NULL,
  slug        VARCHAR(100)  NOT NULL,
  icon_emoji  VARCHAR(10)   DEFAULT '🎟️',
  image_url   TEXT          DEFAULT NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  sort_order  INT           NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_category_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO event_categories (name, slug, icon_emoji, sort_order) VALUES
  ('Music',      'Music',      '🎵', 1),
  ('Sports',     'Sports',     '🏆', 2),
  ('Comedy',     'Comedy',     '😂', 3),
  ('Theatre',    'Theatre',    '🎭', 4),
  ('Conference', 'Conference', '🎤', 5),
  ('Festival',   'Festival',   '🎪', 6),
  ('Workshop',   'Workshop',   '🛠️', 7),
  ('Other',      'Other',      '🎟️', 8);


-- ============================================================
-- SECTION 9 — FEATURE TABLES (Features 4–7)
-- (from migration-features-1-9.sql)
-- ============================================================

-- Feature 4: Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id             INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code           VARCHAR(50)   NOT NULL UNIQUE,
  discount_type  VARCHAR(10)   NOT NULL COMMENT 'percent | flat',
  discount_value DECIMAL(10,2) NOT NULL,
  min_amount     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  max_discount   DECIMAL(10,2) NULL,
  valid_from     DATETIME      NULL,
  valid_to       DATETIME      NULL,
  usage_limit    INT           NOT NULL DEFAULT 0,
  per_user_limit INT           NOT NULL DEFAULT 1,
  usage_count    INT           NOT NULL DEFAULT 0,
  status         VARCHAR(20)   NOT NULL DEFAULT 'active',
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_coupons_code   (code),
  INDEX idx_coupons_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feature 5: Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id               INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id          INT           NOT NULL,
  event_id         INT           NOT NULL,
  rating           TINYINT       NOT NULL,
  review_text      TEXT,
  verified_booking TINYINT(1)    NOT NULL DEFAULT 0,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_review_user_event (user_id, event_id),
  INDEX idx_reviews_event    (event_id),
  INDEX idx_reviews_user     (user_id),
  INDEX idx_reviews_verified (verified_booking),
  CONSTRAINT fk_review_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
  CONSTRAINT fk_review_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feature 6: Wishlists
CREATE TABLE IF NOT EXISTS wishlists (
  id                      INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id                 INT           NOT NULL,
  event_id                INT           NOT NULL,
  notify_on_availability  TINYINT(1)    NOT NULL DEFAULT 0,
  saved_at                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wishlist_user_event (user_id, event_id),
  INDEX idx_wishlist_user   (user_id),
  INDEX idx_wishlist_event  (event_id),
  CONSTRAINT fk_wishlist_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
  CONSTRAINT fk_wishlist_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feature 7: Waitlist
CREATE TABLE IF NOT EXISTS waitlist (
  id             INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id        INT           NOT NULL,
  event_id       INT           NOT NULL,
  tickets_wanted INT           NOT NULL DEFAULT 1,
  notified_at    DATETIME      NULL,
  status         VARCHAR(20)   NOT NULL DEFAULT 'waiting',
  joined_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_waitlist_user_event (user_id, event_id),
  INDEX idx_waitlist_event  (event_id),
  INDEX idx_waitlist_user   (user_id),
  INDEX idx_waitlist_status (event_id, status, joined_at),
  CONSTRAINT fk_waitlist_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
  CONSTRAINT fk_waitlist_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- VERIFY — shows all tables and row counts after migration
-- ============================================================
SELECT
  TABLE_NAME                        AS `Table`,
  TABLE_ROWS                        AS `Rows`,
  ROUND(DATA_LENGTH/1024,1)         AS `Data KB`
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;
