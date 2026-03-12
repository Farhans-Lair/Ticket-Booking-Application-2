const fs   = require("fs");
const path = require("path");

// ── Log directory: /home/ec2-user/ticket-backend/logs inside the container
//    Mapped via Docker volume so CloudWatch agent on the host can read them
const logDir = path.join(__dirname, "../../../logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const APP_LOG   = path.join(logDir, "app.log");
const ERROR_LOG = path.join(logDir, "error.log");

/**
 * Writes a structured JSON log line.
 * @param {"info"|"warn"|"error"} level
 * @param {string} message
 * @param {object} meta  – any extra key/value pairs (userId, eventId, etc.)
 */
const write = (level, message, meta = {}) => {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  });

  const target = level === "error" ? ERROR_LOG : APP_LOG;
  fs.appendFileSync(target, entry + "\n");

  // Also mirror to stdout so Docker / CloudWatch Logs agent picks it up
  // even if the volume mount is not configured
  if (level === "error") {
    console.error(entry);
  } else {
    console.log(entry);
  }
};

module.exports = {
  info:  (message, meta = {}) => write("info",  message, meta),
  warn:  (message, meta = {}) => write("warn",  message, meta),
  error: (message, meta = {}) => write("error", message, meta),
};
