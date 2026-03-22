# =============================================================
#  terraform/alb.tf
# =============================================================

# ---------------------------
# Application Load Balancer
# ---------------------------
resource "aws_lb" "ticket_alb" {
  name               = "${var.project_name}-alb"
  load_balancer_type = "application"
  internal           = false

  security_groups = [aws_security_group.alb_sg.id]

  subnets = [
    aws_subnet.public_subnet_1.id,
    aws_subnet.public_subnet_2.id
  ]

  tags = {
    Name = "${var.project_name}-alb"
  }
}

# ---------------------------
# Target Group
#
# Protocol stays HTTP — the ALB terminates TLS and forwards
# plain HTTP to Node.js on port 3000. The health check therefore
# sends a plain HTTP GET /health to port 3000, which Node.js
# answers with 200. This is what was failing before (Node was
# speaking HTTPS, ALB was probing HTTP → connection refused).
# ---------------------------
resource "aws_lb_target_group" "backend_tg" {
  name     = "${var.project_name}-backend-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.ticket_vpc.id

  health_check {
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  tags = {
    Name = "${var.project_name}-backend-tg"
  }
}

# ---------------------------
# Listener 1 — HTTPS on 443 (primary)
#
# The ALB terminates TLS here using the self-signed cert uploaded
# to IAM by iam_cert.tf. Traffic forwarded to instances is plain HTTP.
# ---------------------------
resource "aws_lb_listener" "https_listener" {
  load_balancer_arn = aws_lb.ticket_alb.arn
  port              = 443
  protocol          = "HTTPS"

  # TLS 1.2 policy — compatible with all modern browsers.
  # The self-signed cert works fine; browsers show a one-time
  # "Not Secure" warning which you click through once.
  ssl_policy = "ELBSecurityPolicy-2016-08"

  # Reference the IAM cert uploaded by iam_cert.tf
  certificate_arn = aws_iam_server_certificate.self_signed.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_tg.arn
  }
}

# ---------------------------
# Listener 2 — HTTP on 80 → redirect to HTTPS (301)
#
# Replaces the old plain-HTTP forward. Anyone who visits
# http://<alb-dns> is automatically sent to https://<alb-dns>.
# ---------------------------
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.ticket_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
