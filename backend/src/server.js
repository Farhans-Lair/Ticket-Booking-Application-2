require("dotenv").config();

const fs        = require("fs");
const http      = require("http");
const https     = require("https");
const app       = require("./app");
const sequelize = require("./config/database");

/* =====================================================
   HTTPS vs HTTP mode — controlled by USE_HTTPS env var

   USE_HTTPS=true  → Local dev: Node.js handles TLS with
                     mkcert certs (docker-compose + certs/)

   USE_HTTPS=false → AWS production: Node.js runs plain HTTP.
                     The ALB holds the cert (uploaded to IAM by
                     Terraform) and terminates TLS. The ALB health
                     check probes GET /health over HTTP on PORT,
                     gets a 200, and the instance stays Healthy.
===================================================== */
const USE_HTTPS  = process.env.USE_HTTPS === "true";
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || "3000", 10);
const HTTP_PORT  = parseInt(process.env.HTTP_PORT  || "3001", 10);
const PORT       = parseInt(process.env.PORT       || "3000", 10);

if (USE_HTTPS) {
  /* ── LOCAL DEV: mkcert self-signed TLS ───────────────────────────────── */
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

  // Primary HTTPS server
  https.createServer(sslOptions, app).listen(HTTPS_PORT, "0.0.0.0", () => {
    console.log(`✅  HTTPS server  → https://localhost:${HTTPS_PORT}`);
  });

  // HTTP → HTTPS redirect so plain http:// links still work locally
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
  /* ── AWS PRODUCTION: plain HTTP, TLS terminated at ALB ───────────────── */
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅  HTTP server   → port ${PORT}  (TLS terminated at ALB)`);
  });
}

/* =====================================================
   Initialize Database
===================================================== */
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅  Database connected");
    await sequelize.sync({ alter: true });
    console.log("✅  Models synchronized");
  } catch (err) {
    console.error("❌  Database initialization failed:", err.message);
  }
})();
