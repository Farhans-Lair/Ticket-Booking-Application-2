const { randomUUID } = require("crypto");

const HEADER_NAME = "X-Correlation-ID";

const correlationId = (req, res, next) => {
  const incoming = req.headers[HEADER_NAME.toLowerCase()];
  const id       = (incoming && incoming.trim()) || randomUUID();

  req.correlationId = id;

  res.setHeader(HEADER_NAME, id);

  next();
};

module.exports = correlationId;
