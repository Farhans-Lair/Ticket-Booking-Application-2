-- =============================================================================
-- Ticket-Booking-Application-2 — Feature Migration SQL
-- Features: seat hold, search filters, QR check-in, coupons, reviews,
--           wishlist, waitlist, correlation tracing, HTTPS redirect
-- Run ONCE against your existing database before deploying updated code.
-- Sequelize sync({ alter: true }) will also apply entity changes at startup.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Feature 1 — Seat hold (10-min temp lock)
-- Add held_until + held_by_user_id to seats; extend status ENUM
-- ---------------------------------------------------------------------------
ALTER TABLE seats
    MODIFY COLUMN status ENUM('available','booked','held') NOT NULL DEFAULT 'available',
    ADD COLUMN IF NOT EXISTS held_until       DATETIME NULL AFTER status,
    ADD COLUMN IF NOT EXISTS held_by_user_id  INT      NULL AFTER held_until;

CREATE INDEX IF NOT EXISTS idx_seats_held ON seats(status, held_until);

-- ---------------------------------------------------------------------------
-- Feature 2 — Search + city / price / date filters
-- Add city column on events (may already exist — IF NOT EXISTS guards it)
-- ---------------------------------------------------------------------------
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS city VARCHAR(100) NULL AFTER location;

CREATE INDEX IF NOT EXISTS idx_events_city  ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_price ON events(price);
CREATE INDEX IF NOT EXISTS idx_events_date  ON events(event_date);

-- ---------------------------------------------------------------------------
-- Feature 3 — QR-code tickets + check-in
-- Add qr_token, checked_in, checked_in_at to bookings
-- ---------------------------------------------------------------------------
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS qr_token      TEXT     NULL   AFTER cancellation_invoice_s3_key,
    ADD COLUMN IF NOT EXISTS checked_in    TINYINT(1) NOT NULL DEFAULT 0 AFTER qr_token,
    ADD COLUMN IF NOT EXISTS checked_in_at DATETIME NULL    AFTER checked_in;

-- ---------------------------------------------------------------------------
-- Feature 4 — Coupon / discount system
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
    id             INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code           VARCHAR(50)   NOT NULL UNIQUE,
    discount_type  VARCHAR(10)   NOT NULL COMMENT 'percent | flat',
    discount_value DECIMAL(10,2) NOT NULL,
    min_amount     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    max_discount   DECIMAL(10,2) NULL,
    valid_from     DATETIME      NULL,
    valid_to       DATETIME      NULL,
    usage_limit    INT           NOT NULL DEFAULT 0  COMMENT '0 = unlimited',
    per_user_limit INT           NOT NULL DEFAULT 1  COMMENT '0 = unlimited',
    usage_count    INT           NOT NULL DEFAULT 0,
    status         VARCHAR(20)   NOT NULL DEFAULT 'active',
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_coupons_code   (code),
    INDEX idx_coupons_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS coupon_code     VARCHAR(50)   NULL   AFTER checked_in_at,
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER coupon_code;

-- ---------------------------------------------------------------------------
-- Feature 5 — Reviews & ratings
-- ---------------------------------------------------------------------------
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,1) NULL          AFTER city,
    ADD COLUMN IF NOT EXISTS review_count   INT          NOT NULL DEFAULT 0 AFTER average_rating;

CREATE TABLE IF NOT EXISTS reviews (
    id               INT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id          INT      NOT NULL,
    event_id         INT      NULL,
    rating           TINYINT  NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text      TEXT,
    verified_booking TINYINT(1) NOT NULL DEFAULT 0,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_review_user_event (user_id, event_id),
    INDEX idx_reviews_event    (event_id),
    INDEX idx_reviews_user     (user_id),
    INDEX idx_reviews_verified (verified_booking)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Feature 6 — Wishlist / save event
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlists (
    id                      INT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id                 INT      NOT NULL,
    event_id                INT      NOT NULL,
    notify_on_availability  TINYINT(1) NOT NULL DEFAULT 0,
    saved_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_wishlist_user_event (user_id, event_id),
    INDEX idx_wishlist_user   (user_id),
    INDEX idx_wishlist_event  (event_id),
    INDEX idx_wishlist_notify (event_id, notify_on_availability)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Feature 7 — Waitlist for sold-out events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS waitlist (
    id             INT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id        INT      NOT NULL,
    event_id       INT      NOT NULL,
    tickets_wanted INT      NOT NULL DEFAULT 1,
    notified_at    DATETIME NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'waiting'
        COMMENT 'waiting | notified | converted | expired',
    joined_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_waitlist_user_event (user_id, event_id),
    INDEX idx_waitlist_event  (event_id),
    INDEX idx_waitlist_user   (user_id),
    INDEX idx_waitlist_status (event_id, status, joined_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- Verification helpers
-- SHOW TABLES;
-- DESCRIBE seats;
-- DESCRIBE bookings;
-- DESCRIBE events;
-- =============================================================================
