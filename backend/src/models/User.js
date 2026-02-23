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
},
 {
  tableName: "users",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = User;
