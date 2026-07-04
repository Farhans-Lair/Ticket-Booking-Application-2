# =============================================================
#  alb.tf
# =============================================================

resource "aws_lb" "ticket_alb" {
  name               = "${var.project_name}-alb"
  load_balancer_type = "application"
  internal           = false
  security_groups    = [aws_security_group.alb_sg.id]

  subnets = [
    aws_subnet.public_subnet_1.id,
    aws_subnet.public_subnet_2.id
  ]

  tags = { Name = "${var.project_name}-alb" }
}

# ---------------------------
# Target Group
# ---------------------------
resource "aws_lb_target_group" "backend_tg" {
  name        = "${var.project_name}-backend-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.ticket_vpc.id
  target_type = "instance"

  health_check {
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  deregistration_delay = 30

  tags = { Name = "${var.project_name}-backend-tg" }
}

# ---------------------------
# Listener: HTTPS 443 (primary)
# ---------------------------
resource "aws_lb_listener" "https_listener" {
  load_balancer_arn = aws_lb.ticket_alb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_iam_server_certificate.self_signed.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_tg.arn
  }
}

# ---------------------------
# Listener: HTTP 80 → 301 redirect to HTTPS
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
