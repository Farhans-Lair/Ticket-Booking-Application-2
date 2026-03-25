-- ============================================================
-- MIGRATION: Cancellation & Refund Feature
-- Run this AFTER the base schema.sql
-- ============================================================

-- ── 1. Cancellation policies (one per event, set by organizer) ──────────────
--
-- tiers: JSON array sorted by hours_before DESC
-- Example:
--   [
--     {"hours_before": 72, "refund_percent": 100},
--     {"hours_before": 24, "refund_percent": 50},
--     {"hours_before": 0,  "refund_percent": 0}
--   ]
--
-- Interpretation: find the first tier where hoursUntilEvent >= hours_before.
-- If no policy exists for an event, cancellation is not allowed.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE cancellation_policies (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  event_id                  INT NOT NULL UNIQUE,
  organizer_id              INT NOT NULL,
  tiers                     JSON NOT NULL,
  is_cancellation_allowed   TINYINT(1) NOT NULL DEFAULT 1,
  created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_policy_event
    FOREIGN KEY (event_id)
    REFERENCES events(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_policy_organizer
    FOREIGN KEY (organizer_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- ── 2. Extend bookings table with cancellation columns ───────────────────────
ALTER TABLE bookings
  ADD COLUMN cancellation_status
    ENUM('active','cancelled','refund_pending','refunded')
    NOT NULL DEFAULT 'active'
    AFTER payment_status,

  ADD COLUMN refund_amount
    FLOAT DEFAULT NULL
    AFTER cancellation_status,

  ADD COLUMN razorpay_refund_id
    VARCHAR(255) DEFAULT NULL
    AFTER refund_amount,

  ADD COLUMN cancelled_at
    TIMESTAMP DEFAULT NULL
    AFTER razorpay_refund_id;
