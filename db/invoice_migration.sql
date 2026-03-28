-- ============================================================
-- INVOICE MIGRATION
-- Adds S3 keys for booking and cancellation invoice PDFs
-- to the bookings table.
--
-- These columns are populated when their respective events fire:
--   booking_invoice_s3_key      → set after verifyPayment (booking confirmed)
--   cancellation_invoice_s3_key → set after cancelBooking  (booking cancelled)
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_invoice_s3_key      VARCHAR(512) DEFAULT NULL
    COMMENT 'S3 key for booking invoice PDF — generated on payment verification',
  ADD COLUMN IF NOT EXISTS cancellation_invoice_s3_key VARCHAR(512) DEFAULT NULL
    COMMENT 'S3 key for cancellation invoice PDF — generated on booking cancellation';

-- Also add the cancellation columns that exist in the Sequelize model
-- but may be missing from the base schema.sql (added by cancellation_migration.sql):
-- cancellation_status, refund_amount, razorpay_refund_id, cancelled_at,
-- cancellation_fee, cancellation_fee_gst, applied_tier_hours
-- Run cancellation_migration.sql first if you have not already.
