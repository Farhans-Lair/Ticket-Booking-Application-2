
resource "aws_s3_bucket" "ticket_pdfs" {
  bucket        = var.s3_bucket_name
  force_destroy = true  # set true only if you want terraform destroy to delete the bucket + contents
}

resource "aws_s3_bucket_public_access_block" "ticket_pdfs" {
  bucket = aws_s3_bucket.ticket_pdfs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ticket_pdfs" {
  bucket = aws_s3_bucket.ticket_pdfs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "ticket_pdfs" {
  bucket = aws_s3_bucket.ticket_pdfs.id

  rule {
    id     = "expire-old-tickets"
    status = "Enabled"

    filter {
      prefix = "tickets/"
    }

    expiration {
      days = 365
    }
  }
}