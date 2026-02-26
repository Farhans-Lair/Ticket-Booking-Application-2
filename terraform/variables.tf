variable "github_org" {
  default = "Farhans-Lair"   # ← change this
}
variable "github_repo" {
  default = "Ticket-Booking-Application-2"  # ← verify this matches your repo name
}

variable "aws_account_id" {
  default = "680318115068"
}

variable "aws_region" {
  default = "ap-south-1"
}

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
  default = "ticket_db"
}

variable "db_username" {
  default = "ticket_user"
}

variable "db_password" {
  description = "RDS_Password"
  sensitive   = true
}
