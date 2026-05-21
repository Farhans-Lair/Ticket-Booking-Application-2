/**
 * correlationId.middleware.js — Feature 8: Correlation ID tracing
 *
 * Runs on every request and:
 *   1. Reads X-Correlation-ID from the incoming request header, or generates
 *      a new UUID if none was provided.
 *   2. Attaches correlationId to req so all downstream handlers can log it.
 *   3. Echoes X-Correlation-ID back in the response so the caller can match
 *      their request to a specific log trace.
 *
 * Usage in any controller/service:
 *   logger.info("Booking confirmed", { correlationId: req.correlationId, ... });
 */
const { randomUUID } = require("crypto");

const HEADER_NAME = "X-Correlation-ID";

const correlationId = (req, res, next) => {
  const incoming = req.headers[HEADER_NAME.toLowerCase()];
  const id       = (incoming && incoming.trim()) || randomUUID();

  // Attach to request so controllers can forward it to logger calls
  req.correlationId = id;

  // Echo back so API consumers can trace their requests in logs
  res.setHeader(HEADER_NAME, id);

  next();
};

module.exports = correlationId;
