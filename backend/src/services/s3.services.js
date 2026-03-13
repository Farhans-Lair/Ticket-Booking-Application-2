const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("../config/s3");
const logger   = require("../config/logger");

const BUCKET = process.env.S3_BUCKET_NAME;

/**
 * Build a consistent S3 object key for a ticket PDF.
 * Pattern: tickets/booking-<bookingId>-user-<userId>.pdf
 */
const buildTicketKey = (bookingId, userId) =>
  `tickets/booking-${bookingId}-user-${userId}.pdf`;

/**
 * Upload a ticket PDF buffer to S3.
 *
 * @param {Buffer} pdfBuffer  - Raw PDF bytes from generateTicketPDF()
 * @param {number} bookingId
 * @param {number} userId
 * @returns {string} The S3 object key that was written
 */
const uploadTicketToS3 = async (pdfBuffer, bookingId, userId) => {
  const key = buildTicketKey(bookingId, userId);

  const command = new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        pdfBuffer,
    ContentType: "application/pdf",
    // Server-side encryption — recommended for sensitive documents
    ServerSideEncryption: "AES256",
    // Metadata for traceability
    Metadata: {
      bookingId: String(bookingId),
      userId:    String(userId),
    },
  });

  await s3Client.send(command);

  logger.info("Ticket PDF uploaded to S3", { bucket: BUCKET, key, bookingId, userId });

  return key;
};

/**
 * Fetch a ticket PDF from S3 and return it as a Buffer.
 *
 * @param {string} s3Key  - The key stored on the Booking record
 * @returns {Buffer}
 */
const fetchTicketFromS3 = async (s3Key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key:    s3Key,
  });

  const response = await s3Client.send(command);

  // response.Body is a ReadableStream — collect it into a Buffer
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }

  logger.info("Ticket PDF fetched from S3", { bucket: BUCKET, key: s3Key });

  return Buffer.concat(chunks);
};

module.exports = {
  buildTicketKey,
  uploadTicketToS3,
  fetchTicketFromS3,
};
