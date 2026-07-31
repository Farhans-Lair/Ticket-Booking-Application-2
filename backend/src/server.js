

require("dotenv").config({ quiet: true });

const fs        = require("fs");
const http      = require("http");
const https     = require("https");
const app       = require("./app");
const sequelize = require("./config/database");

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

    // Schema is managed via db/master_schema.sql (fresh installs) and
    // db/migration.sql (live upgrades). Only auto-sync in local/dev for
    // convenience — running `alter: true` in production risks clashing
    // DDL when multiple ASG instances boot around the same time, and can
    // silently drift the schema away from the reviewed migration files.
    if (process.env.NODE_ENV !== "production") {
      await sequelize.sync({ alter: true });
      console.log("✅  Models synchronized (dev mode)");
    }
  } catch (err) {
    console.error("❌  Database initialization failed:", err.message);
    process.exit(1);
  }
})();
