require("dotenv").config({ quiet: true });

const fs        = require("fs");
const http      = require("http");
const https     = require("https");
const app       = require("./app");
const sequelize = require("./config/database");
const migrator  = require("./config/migrator");
const logger    = require("./config/logger");

// Safety net for async errors that fall outside Express's request/response
// cycle (e.g. a future cron job or background task missing its own
// try/catch). On Node 22+, an unhandled promise rejection terminates the
// process by default — logging it here at least leaves a clear record of
// what happened before that termination, instead of the process just
// vanishing with no trace. uncaughtException is caught for the same reason
// but is not recovered from, since continuing after a truly unknown
// synchronous error is unsafe.
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    message: reason?.message || String(reason),
    stack:   process.env.NODE_ENV !== "production" ? reason?.stack : undefined,
  });
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception — process will exit", {
    message: err.message,
    stack:   err.stack,
  });
  process.exit(1);
});

const USE_HTTPS  = process.env.USE_HTTPS === "true";
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || "3000", 10);
const HTTP_PORT  = parseInt(process.env.HTTP_PORT  || "3001", 10);
const PORT       = parseInt(process.env.PORT       || "3000", 10);

if (USE_HTTPS) {
    let sslOptions;
  try {
    sslOptions = {
      key:  fs.readFileSync(process.env.SSL_KEY_PATH  || "./certs/server.key"),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH || "./certs/server.crt"),
    };
  } catch (err) {
    console.error(
      "❌  Could not load TLS certificates.\n" +
      "    Run  scripts/generate-certs-mkcert.sh  then restart.\n" +
      "    Details:", err.message
    );
    process.exit(1);
  }

  https.createServer(sslOptions, app).listen(HTTPS_PORT, "0.0.0.0", () => {
    console.log(`✅  HTTPS server  → https://localhost:${HTTPS_PORT}`);
  });

  http
    .createServer((req, res) => {
      const host   = (req.headers.host || "localhost").replace(/:\d+$/, "");
      const target = `https://${host}:${HTTPS_PORT}${req.url}`;
      res.writeHead(301, { Location: target });
      res.end();
    })
    .listen(HTTP_PORT, "0.0.0.0", () => {
      console.log(`↩️   HTTP redirect → http://localhost:${HTTP_PORT} → https://localhost:${HTTPS_PORT}`);
    });

} else {
    app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅  HTTP server   → port ${PORT}  (TLS terminated at ALB)`);
  });
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅  Database connected");

    // Schema is managed via Umzug migrations in src/migrations/, run
    // automatically here on every boot. The first migration loads the
    // full baseline from db/master_schema.sql on an empty database;
    // later migrations apply incrementally. Safe to run on every boot —
    // Umzug tracks what has already been applied and skips it.
    const pending = await migrator.pending();
    if (pending.length > 0) {
      await migrator.up();
      console.log(`✅  Applied ${pending.length} pending migration(s)`);
    } else {
      console.log("✅  Schema up to date, no migrations to apply");
    }

    // Only auto-sync in local/dev for convenience — running `alter: true`
    // in production risks clashing DDL when multiple ASG instances boot
    // around the same time, and can silently drift the schema away from
    // the reviewed migration files.
    if (process.env.NODE_ENV !== "production") {
      await sequelize.sync({ alter: true });
      console.log("✅  Models synchronized (dev mode)");
    }
  } catch (err) {
    console.error("❌  Database initialization failed:", err.message);
    process.exit(1);
  }
})();