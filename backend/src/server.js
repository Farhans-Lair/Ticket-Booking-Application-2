require("dotenv").config();

const fs        = require("fs");
const http      = require("http");
const https     = require("https");
const app = require("./app");
const sequelize = require("./config/database");

const HTTPS_PORT = process.env.HTTPS_PORT || 3000;
const HTTP_PORT  = process.env.HTTP_PORT  || 3001; // redirect-only

/* =====================================================
   Load TLS Certificates
   Paths are set via env vars so they work both
   locally and inside Docker (mounted volume).
===================================================== */
let sslOptions;
try {
  sslOptions = {
    key:  fs.readFileSync(process.env.SSL_KEY_PATH  || "./certs/server.key"),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || "./certs/server.crt"),
  };
} catch (err) {
  console.error(
    "❌  Could not load TLS certificates.\n" +
    "    Run  scripts/generate-certs.sh  then restart.\n" +
    "    Details:", err.message
  );
  process.exit(1);
}

/* =====================================================
   HTTPS Server (primary)
===================================================== */
https.createServer(sslOptions, app).listen(HTTPS_PORT, "0.0.0.0", () => {
  console.log(`✅  HTTPS server running on https://localhost:${HTTPS_PORT}`);
});


/* =====================================================
   HTTP → HTTPS Redirect Server (convenience)
   Runs on HTTP_PORT so plain http:// links still work.
===================================================== */
http
  .createServer((req, res) => {
    const host = req.headers.host
      ? req.headers.host.replace(/:\d+$/, "") // strip any port
      : "localhost";

    const target = `https://${host}:${HTTPS_PORT}${req.url}`;
    res.writeHead(301, { Location: target });
    res.end();
  })
  .listen(HTTP_PORT, "0.0.0.0", () => {
    console.log(
      `↩️   HTTP redirect server on http://localhost:${HTTP_PORT} → https://localhost:${HTTPS_PORT}`
    );
  });

// Initialize DB
(async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");

    await sequelize.sync({ alter: true });
    console.log("Models synchronized successfully");
  } catch (err) {
    console.error("Database initialization failed:", err.message);
  }
})();
  