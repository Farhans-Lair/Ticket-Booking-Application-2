<<<<<<< HEAD
variable "github_org" {
  default = "Farhans-Lair"
}
variable "github_repo" {
  default = "Ticket-Booking-Application-2"
}

variable "aws_account_id" {
  default = "453551850734"
}

variable "aws_region" {
  default = "ap-south-1"
}

=======
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
variable "project_name" {
  default = "ticket"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "public_subnet_1_cidr" {
  default = "10.0.1.0/24"
}

variable "public_subnet_2_cidr" {
  default = "10.0.2.0/24"
}

variable "db_name" {
<<<<<<< HEAD
  default = "ticket_booking_db"
}

variable "db_username" {
  default = "ticket_user_1"
=======
  default = "ticket_db"
}

variable "db_username" {
  default = "ticket_user"
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
}

variable "db_password" {
  description = "RDS_Password"
  sensitive   = true
}
<<<<<<< HEAD

variable "jwt_secret" {
  description = "JWT secret key"
  sensitive   = true
}

variable "razorpay_key_id" {
  description = "Razorpay Key ID"
  sensitive   = true
}

variable "razorpay_key_secret" {
  description = "Razorpay Key Secret"
  sensitive   = true
}

variable "email_user" {
  description = "Gmail address for sending emails"
  sensitive   = true
}

variable "email_pass" {
  description = "Gmail App Password"
  sensitive   = true
}

variable "alert_email" {
  description = "Email address to receive CloudWatch alarm notifications via SNS"
  sensitive   = false
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket that stores generated ticket PDFs"
  type        = string
}

variable "cert_chain_path" {
  description = "Absolute path to the mkcert CA root certificate (rootCA.pem). Find it by running: mkcert -CAROOT"
  type        = string
}
=======
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
