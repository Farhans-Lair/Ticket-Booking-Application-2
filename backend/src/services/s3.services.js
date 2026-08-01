const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("../config/s3");
const logger   = require("../config/logger");

const BUCKET = process.env.S3_BUCKET_NAME;

const buildTicketKey = (bookingId, userId) =>
  `tickets/booking-${bookingId}-user-${userId}.pdf`;

const buildInvoiceKey = (bookingId, userId, type) =>
  `invoices/${type}-invoice-${bookingId}-user-${userId}.pdf`;

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
