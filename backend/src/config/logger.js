const fs   = require("fs");
const path = require("path");

const logDir = path.join(__dirname, "../../../logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const APP_LOG   = path.join(logDir, "app.log");
const ERROR_LOG = path.join(logDir, "error.log");

const write = (level, message, meta = {}) => {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  });

  const target = level === "error" ? ERROR_LOG : APP_LOG;
  fs.appendFileSync(target, entry + "\n");

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
