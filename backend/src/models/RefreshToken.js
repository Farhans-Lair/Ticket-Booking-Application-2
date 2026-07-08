const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * RefreshToken — stores hashed 7-day refresh tokens.
 * One row per active session. Destroyed on logout or rotation.
 */
const RefreshToken = sequelize.define("RefreshToken", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  token_hash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    comment: "SHA-256 hex of the raw refresh token",
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: "refresh_tokens",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
  indexes: [
    { fields: ["user_id"] },
    { fields: ["token_hash"], unique: true },
    { fields: ["expires_at"] },
  ],
});

module.exports = RefreshToken;
