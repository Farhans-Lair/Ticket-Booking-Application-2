// The CancellationPolicy model (and cancellation.services.js) were refactored
// to store refund rules as a single JSON `tiers` array plus an
// `is_cancellation_allowed` flag. The deployed `cancellation_policies` table
// (created by db/migration.sql) still has the old flat tier1/2/3 columns and
// is missing `tiers` entirely, which caused:
//   "Unknown column 'tiers' in 'field list'"
// This migration adds the missing columns and backfills any existing rows
// from the legacy tier1/2/3 columns so nothing is lost.

async function up({ context: sequelize }) {
  const [existingTiersCol] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cancellation_policies'
      AND COLUMN_NAME = 'tiers'
  `);

  if (existingTiersCol.length === 0) {
    await sequelize.query(`
      ALTER TABLE cancellation_policies
        ADD COLUMN tiers JSON NULL AFTER organizer_id
    `);
  }

  const [existingAllowedCol] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cancellation_policies'
      AND COLUMN_NAME = 'is_cancellation_allowed'
  `);

  if (existingAllowedCol.length === 0) {
    await sequelize.query(`
      ALTER TABLE cancellation_policies
        ADD COLUMN is_cancellation_allowed TINYINT(1) NOT NULL DEFAULT 1 AFTER tiers
    `);
  }

  // Backfill tiers JSON from the legacy tier1/2/3 columns for any rows
  // created before this migration (only if those legacy columns still exist).
  const [legacyCols] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cancellation_policies'
      AND COLUMN_NAME = 'tier1_hours_before'
  `);

  if (legacyCols.length > 0) {
    await sequelize.query(`
      UPDATE cancellation_policies
      SET
        tiers = JSON_ARRAY(
          JSON_OBJECT('hours_before', tier1_hours_before, 'refund_percent', tier1_refund_percent),
          JSON_OBJECT('hours_before', tier2_hours_before, 'refund_percent', tier2_refund_percent),
          JSON_OBJECT('hours_before', tier3_hours_before, 'refund_percent', tier3_refund_percent)
        ),
        is_cancellation_allowed = COALESCE(allow_cancellation, 1)
      WHERE tiers IS NULL
    `);
  }

  // Any remaining rows with no legacy data get a sensible default so the
  // NOT NULL constraint below can be applied safely.
  await sequelize.query(`
    UPDATE cancellation_policies
    SET tiers = JSON_ARRAY(
      JSON_OBJECT('hours_before', 72, 'refund_percent', 100),
      JSON_OBJECT('hours_before', 24, 'refund_percent', 50),
      JSON_OBJECT('hours_before', 0,  'refund_percent', 0)
    )
    WHERE tiers IS NULL
  `);

  await sequelize.query(`
    ALTER TABLE cancellation_policies MODIFY COLUMN tiers JSON NOT NULL
  `);
}

async function down({ context: sequelize }) {
  // Intentionally a no-op, same rationale as the baseline migration —
  // dropping these columns could destroy organizer-configured policies.
}

module.exports = { up, down };
