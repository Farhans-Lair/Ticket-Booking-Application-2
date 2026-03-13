const { S3Client } = require("@aws-sdk/client-s3");

/**
 * AWS S3 client — configured via environment variables.
 *
 * Required env vars:
 *   AWS_REGION          e.g. "ap-south-1"
 *   AWS_ACCESS_KEY_ID   IAM user / role key
 *   AWS_SECRET_ACCESS_KEY
 *   S3_BUCKET_NAME      target bucket name
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

module.exports = s3Client;
