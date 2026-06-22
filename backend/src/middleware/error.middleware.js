<<<<<<< HEAD
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
=======
const errorHandler = (err, req, res, next) => {
  console.error("ERROR:", err.message);

  const statusCode = err.statusCode || 500;
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac

  res.status(statusCode).json({
    error: err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
