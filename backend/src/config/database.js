const { Sequelize } = require("sequelize");

// ── Validate required environment variables before connecting ────────────────
const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missing  = required.filter(k => !process.env[k]);

if (missing.length > 0) {
  console.error("\n❌  DATABASE CONFIG ERROR");
  console.error("──────────────────────────────────────────────────");
  console.error("The following required environment variables are missing:");
  missing.forEach(k => console.error(`   • ${k}`));
  console.error("\n👉  Fix: create the file  backend/.env  and set:");
  console.error("   DB_HOST=localhost");
  console.error("   DB_PORT=3306");
  console.error("   DB_NAME=ticket_booking_db");
  console.error("   DB_USER=root");
  console.error("   DB_PASSWORD=your_mysql_password");
  console.error("\n   See backend/.env for the full template.\n");
  process.exit(1);   // Hard stop — no point running with no DB config
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host:    process.env.DB_HOST,
    port:    parseInt(process.env.DB_PORT || "3306", 10),
    dialect: "mysql",

    // Only log SQL queries in development
    logging: process.env.NODE_ENV === "development" ? console.log : false,

    pool: {
      max:     10,
      min:     0,
      acquire: 30000,
      idle:    10000,
    },

    dialectOptions: {
      // Prevents "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR" on lost connections
      connectTimeout: 20000,
    },

    define: {
      underscored:    true,   // map camelCase to snake_case automatically
      freezeTableName: true,  // don't pluralise table names
    },
  }
);

module.exports = sequelize;
