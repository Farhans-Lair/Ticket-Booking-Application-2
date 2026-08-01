const fs   = require("fs");
const path = require("path");

// Reuses the existing db/master_schema.sql as-is instead of duplicating the
// schema in JS — this migration is just the delivery mechanism, not a
// second source of truth for table structure.
const schemaPath = path.join(__dirname, "..", "..", "..", "db", "master_schema.sql");

async function up({ context: sequelize }) {
  const sql = fs.readFileSync(schemaPath, "utf8");

  // Sequelize does not run multiple statements in a single query call, so
  // the file is split into individual statements and executed in order.
  const statements = sql
    .split(";")
    .map(statement => statement.trim())
    .filter(statement => statement.length > 0);

  for (const statement of statements) {
    await sequelize.query(statement);
  }
}

async function down({ context: sequelize }) {
  // Intentionally left as a no-op. Rolling back the baseline schema would
  // mean dropping every table, which is destructive enough that it should
  // only ever be done deliberately and by hand, never via an automated
  // migration rollback.
}

module.exports = { up, down };