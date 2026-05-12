-- ============================================================
-- FEATURES MIGRATION
-- Adds support for:
--  1. User profile (phone, avatar_url)
--  2. Featured / trending events (is_featured)
--  3. Event reminders (reminder_sent flag on bookings)
--  4. Event moderation (status on events)
--  5. Organizer payouts (payouts table)
-- Run after the base schema.sql and all previous migrations.
-- ============================================================

-- ── 1. User profile enhancements ────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone       VARCHAR(20)   DEFAULT NULL  AFTER email,
  ADD COLUMN IF NOT EXISTS avatar_url  VARCHAR(512)  DEFAULT NULL  AFTER phone,
  ADD COLUMN IF NOT EXISTS bio         TEXT          DEFAULT NULL  AFTER avatar_url,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- ── 2. Featured flag on events ───────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER category;

-- ── 3. Event moderation status ───────────────────────────────
-- Platform (admin) events default to 'approved'.
-- Organizer events start as 'pending' and require admin approval.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS status              ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER is_featured,
  ADD COLUMN IF NOT EXISTS moderation_note     TEXT          DEFAULT NULL  AFTER status,
  ADD COLUMN IF NOT EXISTS moderated_at        TIMESTAMP     DEFAULT NULL  AFTER moderation_note,
  ADD COLUMN IF NOT EXISTS moderated_by        INT           DEFAULT NULL  AFTER moderated_at;

-- FK for moderated_by → users.id (admin who took action)
ALTER TABLE events
  ADD CONSTRAINT fk_event_moderated_by
    FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL;

-- ── 4. Reminder flag on bookings ─────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_sent TINYINT(1) NOT NULL DEFAULT 0 AFTER payment_status;

-- ── 5. Organizer payouts table ───────────────────────────────
CREATE TABLE IF NOT EXISTS payouts (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  organizer_id     INT          NOT NULL,
  event_id         INT          DEFAULT NULL,
  amount           DECIMAL(12,2) NOT NULL,
  platform_fee     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_amount       DECIMAL(12,2) NOT NULL,
  currency         VARCHAR(10)  NOT NULL DEFAULT 'INR',
  status           ENUM('pending','processing','paid','failed') NOT NULL DEFAULT 'pending',
  payment_method   VARCHAR(50)  DEFAULT NULL,   -- 'bank_transfer','upi','cheque'
  reference_id     VARCHAR(255) DEFAULT NULL,   -- UTR / cheque number etc.
  notes            TEXT         DEFAULT NULL,
  initiated_by     INT          DEFAULT NULL,   -- admin user id
  paid_at          TIMESTAMP    DEFAULT NULL,
  created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_payout_organizer
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payout_event
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  CONSTRAINT fk_payout_initiated_by
    FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Index for organizer payout history queries
CREATE INDEX IF NOT EXISTS idx_payouts_organizer ON payouts (organizer_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_event     ON payouts (event_id);
