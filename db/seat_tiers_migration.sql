-- ============================================================
-- SEAT TIERS MIGRATION
-- Adds seat_tier and tier_price to seats table.
-- Adds payout_request support fields to payouts table.
-- ============================================================

-- Seat tier fields
ALTER TABLE seats
  ADD COLUMN IF NOT EXISTS seat_tier   VARCHAR(50)    NOT NULL DEFAULT 'General' AFTER seat_number,
  ADD COLUMN IF NOT EXISTS tier_price  DECIMAL(10,2)  NOT NULL DEFAULT 0.00      AFTER seat_tier;

-- Make event price optional (0 = tier-based pricing)
-- No schema change needed; price column stays but will default to 0 for tier-based events.

-- Payout request fields (organizer initiates, admin approves)
ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS requested_by   INT           DEFAULT NULL AFTER initiated_by,
  ADD COLUMN IF NOT EXISTS request_note   TEXT          DEFAULT NULL AFTER requested_by,
  ADD COLUMN IF NOT EXISTS requested_at   TIMESTAMP     DEFAULT NULL AFTER request_note;

ALTER TABLE payouts
  ADD CONSTRAINT IF NOT EXISTS fk_payout_requested_by
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL;
