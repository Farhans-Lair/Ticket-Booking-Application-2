const logger = require("../config/logger");

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  logger.error("Unhandled error", {
    statusCode,
    message:  err.message,
    method:   req.method,
    url:      req.originalUrl,
    userId:   req.user?.id || null,
    stack:    process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });

  res.status(statusCode).json({
    error: err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
