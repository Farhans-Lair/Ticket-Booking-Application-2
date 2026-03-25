const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CancellationPolicy = sequelize.define("CancellationPolicy", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  organizer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  /**
   * JSON array of refund tiers, sorted by hours_before DESC.
   * Each tier: { hours_before: number, refund_percent: number }
   *
   * Example:
   * [
   *   { hours_before: 72, refund_percent: 100 },
   *   { hours_before: 24, refund_percent: 50  },
   *   { hours_before: 0,  refund_percent: 0   }
   * ]
   *
   * Interpretation: find the first tier where hoursUntilEvent >= hours_before.
   * That tier's refund_percent applies.
   */
  tiers: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  is_cancellation_allowed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: "cancellation_policies",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

module.exports = CancellationPolicy;
