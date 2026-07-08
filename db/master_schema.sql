-- ============================================================
-- TICKETVERSE — COMPLETE MASTER SCHEMA
-- Compatible with MySQL 8.0+
-- Run this on a fresh / empty database.
-- Usage:
--   mysql -u root -p ticket_booking_db < master_schema.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS waitlist;
DROP TABLE IF EXISTS wishlists;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS payouts;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS seats;
DROP TABLE IF EXISTS cancellation_policies;
DROP TABLE IF EXISTS organizer_profiles;
DROP TABLE IF EXISTS event_categories;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ──────────────────────────────────────────────
-- 1. USERS
-- ──────────────────────────────────────────────
CREATE TABLE users (
  id            INT           NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  password_hash TEXT          NOT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'user',

  -- User Profile fields
  phone         VARCHAR(20)   DEFAULT NULL,
  avatar_url    VARCHAR(512)  DEFAULT NULL,
  bio           TEXT          DEFAULT NULL,
  bank_details  JSON          DEFAULT NULL,

  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ──────────────────────────────────────────────
-- 2. EVENTS
--    FIX: Added city, average_rating, review_count
--         (Feature 2: Search filters; Feature 5: Ratings)
-- ──────────────────────────────────────────────
CREATE TABLE events (
  id                 INT           NOT NULL AUTO_INCREMENT,
  organizer_id       INT           DEFAULT NULL,
  title              VARCHAR(200)  NOT NULL,
  description        TEXT          DEFAULT NULL,
  location           VARCHAR(150)  DEFAULT NULL,
  event_date         DATETIME      NOT NULL,
  price              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_tickets      INT           NOT NULL,
  available_tickets  INT           NOT NULL,
  category           VARCHAR(100)  NOT NULL DEFAULT 'Other',
  is_featured        TINYINT(1)    NOT NULL DEFAULT 0,
  status             ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  moderation_note    TEXT          DEFAULT NULL,
  moderated_at       DATETIME      DEFAULT NULL,
  moderated_by       INT           DEFAULT NULL,
  images             LONGTEXT      DEFAULT NULL,

  -- Feature 2: City filter for search
  city               VARCHAR(100)  DEFAULT NULL,

  -- Feature 5: Cached rating values (updated by review trigger)
  average_rating     DECIMAL(3,1)  DEFAULT NULL,
  review_count       INT           NOT NULL DEFAULT 0,

  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_events_organizer (organizer_id),
  KEY idx_events_status    (status),
  KEY idx_events_featured  (is_featured),
  KEY idx_events_city      (city),
  KEY idx_events_date      (event_date),
  KEY idx_events_price     (price),
  CONSTRAINT fk_events_organizer
    FOREIGN KEY (organizer_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_events_moderated_by
    FOREIGN KEY (moderated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ──────────────────────────────────────────────
-- 3. SEATS
--    FIX: status ENUM now includes 'held'
--         held_until, held_by_user_id for 10-min lock
--         (Feature 1: Seat Hold)
-- ──────────────────────────────────────────────
CREATE TABLE seats (
  id               INT           NOT NULL AUTO_INCREMENT,
  event_id         INT           NOT NULL,
  seat_number      VARCHAR(10)   NOT NULL,
  seat_tier        VARCHAR(50)   NOT NULL DEFAULT 'General',
  tier_price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,

  -- FIX: Added 'held' to ENUM
  status           ENUM('available','booked','held') NOT NULL DEFAULT 'available',

  -- Feature 1: Seat hold fields
  held_until       DATETIME      DEFAULT NULL,
  held_by_user_id  INT           DEFAULT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_seat_event    (event_id, seat_number),
  KEY idx_seats_event         (event_id),
  KEY idx_seats_status        (status),
  KEY idx_seats_held          (status, held_until),
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
--    FIX: Added all missing columns:
--         razorpay_refund_id, applied_tier_hours,
--         cancellation_invoice_s3_key,
--         qr_token, checked_in, checked_in_at   (Feature 3: QR)
--         coupon_code, discount_amount           (Feature 4: Coupons)
-- ──────────────────────────────────────────────
CREATE TABLE bookings (
  id                           INT           NOT NULL AUTO_INCREMENT,
  user_id                      INT           NOT NULL,
  event_id                     INT           NOT NULL,
  tickets_booked               INT           NOT NULL,
  selected_seats               TEXT          DEFAULT NULL,

  -- Revenue breakdown
  ticket_amount                DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  convenience_fee              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  gst_amount                   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_paid                   DECIMAL(10,2) NOT NULL DEFAULT 0.00,

  -- Payment
  razorpay_order_id            VARCHAR(100)  DEFAULT NULL,
  razorpay_payment_id          VARCHAR(100)  DEFAULT NULL,
  payment_status               ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',

  -- Reminder
  reminder_sent                TINYINT(1)    NOT NULL DEFAULT 0,

  -- Cancellation
  cancellation_status          VARCHAR(30)   NOT NULL DEFAULT 'active',
  cancellation_reason          TEXT          DEFAULT NULL,
  cancellation_fee             DECIMAL(10,2) DEFAULT NULL,
  cancellation_fee_gst         DECIMAL(10,2) DEFAULT NULL,
  applied_tier_hours           INT           DEFAULT NULL,
  refund_amount                DECIMAL(10,2) DEFAULT NULL,
  razorpay_refund_id           VARCHAR(255)  DEFAULT NULL,
  cancelled_at                 DATETIME      DEFAULT NULL,

  -- S3 PDF keys
  ticket_pdf_s3_key            VARCHAR(512)  DEFAULT NULL,
  booking_invoice_s3_key       VARCHAR(512)  DEFAULT NULL,
  cancellation_invoice_s3_key  VARCHAR(512)  DEFAULT NULL,

  -- Feature 3: QR code check-in
  qr_token                     TEXT          DEFAULT NULL,
  checked_in                   TINYINT(1)    NOT NULL DEFAULT 0,
  checked_in_at                DATETIME      DEFAULT NULL,

  -- Feature 4: Coupon discount
  coupon_code                  VARCHAR(50)   DEFAULT NULL,
  discount_amount              DECIMAL(10,2) NOT NULL DEFAULT 0.00,

  booking_date                 TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_bookings_user        (user_id),
  KEY idx_bookings_event       (event_id),
  KEY idx_bookings_payment     (payment_status),
  KEY idx_bookings_reminder    (reminder_sent),
  KEY idx_bookings_cancel      (cancellation_status),
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
  UNIQUE KEY uq_cancellation_event   (event_id),
  KEY idx_cancellation_organizer     (organizer_id),
  CONSTRAINT fk_cancellation_event
    FOREIGN KEY (event_id)     REFERENCES events (id) ON DELETE CASCADE,
  CONSTRAINT fk_cancellation_organizer
    FOREIGN KEY (organizer_id) REFERENCES users  (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ──────────────────────────────────────────────
-- 7. PAYOUTS
-- ──────────────────────────────────────────────
CREATE TABLE payouts (
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
  KEY idx_payouts_organizer  (organizer_id, status),
  KEY idx_payouts_event      (event_id),
  KEY idx_payouts_status     (status),
  CONSTRAINT fk_payout_organizer
    FOREIGN KEY (organizer_id) REFERENCES users  (id) ON DELETE CASCADE,
  CONSTRAINT fk_payout_event
    FOREIGN KEY (event_id)     REFERENCES events (id) ON DELETE SET NULL,
  CONSTRAINT fk_payout_initiated_by
    FOREIGN KEY (initiated_by) REFERENCES users  (id) ON DELETE SET NULL,
  CONSTRAINT fk_payout_requested_by
    FOREIGN KEY (requested_by) REFERENCES users  (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ──────────────────────────────────────────────
-- 8. EVENT CATEGORIES
-- ──────────────────────────────────────────────
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


-- ──────────────────────────────────────────────
-- 9. COUPONS  (Feature 4)
-- ──────────────────────────────────────────────
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


-- ──────────────────────────────────────────────
-- 10. REVIEWS  (Feature 5)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id               INT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id          INT      NOT NULL,
  event_id         INT      NOT NULL,
  rating           TINYINT  NOT NULL,
  review_text      TEXT,
  verified_booking TINYINT(1) NOT NULL DEFAULT 0,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_review_user_event (user_id, event_id),
  INDEX idx_reviews_event    (event_id),
  INDEX idx_reviews_user     (user_id),
  INDEX idx_reviews_verified (verified_booking),
  CONSTRAINT fk_review_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
  CONSTRAINT fk_review_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ──────────────────────────────────────────────
-- 11. WISHLISTS  (Feature 6)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id                      INT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id                 INT      NOT NULL,
  event_id                INT      NOT NULL,
  notify_on_availability  TINYINT(1) NOT NULL DEFAULT 0,
  saved_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wishlist_user_event (user_id, event_id),
  INDEX idx_wishlist_user   (user_id),
  INDEX idx_wishlist_event  (event_id),
  CONSTRAINT fk_wishlist_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
  CONSTRAINT fk_wishlist_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ──────────────────────────────────────────────
-- 12. WAITLIST  (Feature 7)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id             INT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id        INT      NOT NULL,
  event_id       INT      NOT NULL,
  tickets_wanted INT      NOT NULL DEFAULT 1,
  notified_at    DATETIME NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'waiting',
  joined_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_waitlist_user_event (user_id, event_id),
  INDEX idx_waitlist_event  (event_id),
  INDEX idx_waitlist_user   (user_id),
  INDEX idx_waitlist_status (event_id, status, joined_at),
  CONSTRAINT fk_waitlist_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
  CONSTRAINT fk_waitlist_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- ──────────────────────────────────────────────
-- 13. REFRESH TOKENS  (#1)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NOT NULL,
  token_hash  VARCHAR(64)   NOT NULL UNIQUE,
  expires_at  DATETIME      NOT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rt_user    (user_id),
  INDEX idx_rt_hash    (token_hash),
  INDEX idx_rt_expires (expires_at),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────
-- VERIFY
-- ──────────────────────────────────────────────
SELECT
  TABLE_NAME                        AS `Table`,
  TABLE_ROWS                        AS `Rows`,
  ROUND(DATA_LENGTH/1024,1)         AS `Data KB`
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;
