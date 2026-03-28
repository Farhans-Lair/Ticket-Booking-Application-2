const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("../config/s3");
const logger   = require("../config/logger");

const BUCKET = process.env.S3_BUCKET_NAME;

// ─────────────────────────────────────────────────────────────────────────────
// KEY BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/** tickets/booking-<bookingId>-user-<userId>.pdf */
const buildTicketKey = (bookingId, userId) =>
  `tickets/booking-${bookingId}-user-${userId}.pdf`;

/**
 * invoices/booking-invoice-<bookingId>-user-<userId>.pdf
 * invoices/cancellation-invoice-<bookingId>-user-<userId>.pdf
 * type: "booking" | "cancellation"
 */
const buildInvoiceKey = (bookingId, userId, type) =>
  `invoices/${type}-invoice-${bookingId}-user-${userId}.pdf`;

// ─────────────────────────────────────────────────────────────────────────────
// TICKET PDF — upload / fetch
// ─────────────────────────────────────────────────────────────────────────────

const uploadTicketToS3 = async (pdfBuffer, bookingId, userId) => {
  const key = buildTicketKey(bookingId, userId);

  await s3Client.send(new PutObjectCommand({
    Bucket:               BUCKET,
    Key:                  key,
    Body:                 pdfBuffer,
    ContentType:          "application/pdf",
    ServerSideEncryption: "AES256",
    Metadata: {
      bookingId: String(bookingId),
      userId:    String(userId),
      docType:   "ticket",
    },
  }));

  logger.info("Ticket PDF uploaded to S3", { bucket: BUCKET, key, bookingId, userId });
  return key;
};

const fetchTicketFromS3 = async (s3Key) => {
  const response = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));

  const chunks = [];
  for await (const chunk of response.Body) chunks.push(chunk);

  logger.info("Ticket PDF fetched from S3", { bucket: BUCKET, key: s3Key });
  return Buffer.concat(chunks);
};

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE PDF — upload / fetch
// Supports type: "booking" | "cancellation"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a booking or cancellation invoice PDF to S3.
 *
 * @param {Buffer} pdfBuffer
 * @param {number} bookingId
 * @param {number} userId
 * @param {"booking"|"cancellation"} type
 * @returns {string} S3 key
 */
const uploadInvoiceToS3 = async (pdfBuffer, bookingId, userId, type) => {
  const key = buildInvoiceKey(bookingId, userId, type);

  await s3Client.send(new PutObjectCommand({
    Bucket:               BUCKET,
    Key:                  key,
    Body:                 pdfBuffer,
    ContentType:          "application/pdf",
    ServerSideEncryption: "AES256",
    Metadata: {
      bookingId: String(bookingId),
      userId:    String(userId),
      docType:   `${type}-invoice`,
    },
  }));

  logger.info(`${type} invoice uploaded to S3`, { bucket: BUCKET, key, bookingId, userId });
  return key;
};

/**
 * Fetch any invoice PDF from S3 by its stored key.
 *
 * @param {string} s3Key
 * @returns {Buffer}
 */
const fetchInvoiceFromS3 = async (s3Key) => {
  const response = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));

  const chunks = [];
  for await (const chunk of response.Body) chunks.push(chunk);

  logger.info("Invoice PDF fetched from S3", { bucket: BUCKET, key: s3Key });
  return Buffer.concat(chunks);
};

module.exports = {
  buildTicketKey,
  buildInvoiceKey,
  uploadTicketToS3,
  fetchTicketFromS3,
  uploadInvoiceToS3,
  fetchInvoiceFromS3,
};
