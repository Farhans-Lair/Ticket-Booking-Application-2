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
# Target Group (Backend)
# ---------------------------
resource "aws_lb_target_group" "backend_tg" {
  name     = "${var.project_name}-backend-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id  = aws_vpc.ticket_vpc.id

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
# ALB Listener
# ---------------------------
resource "aws_lb_listener" "http_listener" {
  load_balancer_arn = aws_lb.ticket_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_tg.arn
  }
}
