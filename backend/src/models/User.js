const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(150),
    unique: true,
    allowNull: false,
  },
  password_hash: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "user",
  },
  // ── Feature 1: User Profile ──────────────────────────────────
  phone: {
    type: DataTypes.STRING(20),
    defaultValue: null,
  },
  avatar_url: {
    type: DataTypes.STRING(512),
    defaultValue: null,
  },
  bio: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },
  bank_details: {
    type: DataTypes.JSON,
    defaultValue: null,
  },
},
{
  tableName: "users",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

module.exports = User;
