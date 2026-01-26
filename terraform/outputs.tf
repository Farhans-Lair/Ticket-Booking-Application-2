output "rds_endpoint" {
  value = aws_db_instance.ticket_db.endpoint
}

output "alb_dns_name" {
  value = aws_lb.ticket_alb.dns_name
}
