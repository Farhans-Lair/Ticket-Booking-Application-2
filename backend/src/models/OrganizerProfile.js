const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const OrganizerProfile = sequelize.define("OrganizerProfile", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  // FK to users.id  (unique — one profile per organizer)
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },

  business_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },

  contact_phone: {
    type: DataTypes.STRING(20),
    defaultValue: null,
  },

  // GST Identification Number (optional — required at payout stage)
  gst_number: {
    type: DataTypes.STRING(20),
    defaultValue: null,
  },

  address: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },

  // Admin approval gate
  // pending  → newly registered, awaiting review
  // approved → can create and manage events
  // rejected → blocked, rejection_reason will explain why
  status: {
    type: DataTypes.ENUM("pending", "approved", "rejected"),
    allowNull: false,
    defaultValue: "pending",
  },

  rejection_reason: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },
},
{
  tableName: "organizer_profiles",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

module.exports = OrganizerProfile;
