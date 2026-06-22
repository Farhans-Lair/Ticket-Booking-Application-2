output "rds_endpoint" {
<<<<<<< HEAD
  value = aws_db_instance.ticket_booking_db.endpoint
=======
  value = aws_db_instance.ticket_db.endpoint
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
}

output "alb_dns_name" {
  value = aws_lb.ticket_alb.dns_name
}
<<<<<<< HEAD

output "app_url" {
  description = "Open this URL in your browser (click through the self-signed cert warning once)"
  value       = "https://${aws_lb.ticket_alb.dns_name}"
}

output "iam_certificate_name" {
  description = "Name of the self-signed cert uploaded to IAM"
  value       = aws_iam_server_certificate.self_signed.name
}

output "iam_certificate_arn" {
  description = "ARN of the IAM cert attached to the ALB HTTPS listener"
  value       = aws_iam_server_certificate.self_signed.arn
}
=======
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
