output "rds_endpoint" {
  value = aws_db_instance.ticket_booking_db.endpoint
}

output "alb_dns_name" {
  value = aws_lb.ticket_alb.dns_name
}

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

output "rds_replica_endpoint" {
  description = "RDS Read Replica endpoint — use for GET /events, /reviews, /search"
  value       = aws_db_instance.ticket_booking_db_replica.endpoint
}

output "github_ecr_push_role_arn" {
  description = "ARN GitHub Actions assumes via OIDC to push images and deploy. Must match terraform.tfvars-derived value used in docker-build.yml."
  value       = aws_iam_role.github_ecr_push_role.arn
}

output "nat_gateway_ip" {
  description = "Elastic IP of the NAT Gateway (whitelist this in external APIs)"
  value       = aws_eip.nat_eip.public_ip
}
