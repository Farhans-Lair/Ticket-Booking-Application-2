const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Event = sequelize.define("Event", 
  {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  location: {
    type: DataTypes.STRING(150),
  },
  event_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },

  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
     validate: {
      min: 0
    }
  },

  total_tickets: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  available_tickets: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
    category: {
    type: DataTypes.ENUM(
      'Music','Sports','Comedy','Theatre',
      'Conference','Festival','Workshop','Other'
    ),
    defaultValue: 'Other',
  },
// ── IMAGES: stored as JSON array of base64 strings in a TEXT column ──
  images: {
    type: DataTypes.TEXT ("long"),   // LONGTEXT — base64 images can exceed 65KB TEXT limit
    defaultValue: null,
    get() {
    const raw = this.getDataValue('images');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },
    set(val) {
      this.setDataValue('images', val ? JSON.stringify(val) : null);
   },
  },
},

{
  tableName: "events",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = Event;
