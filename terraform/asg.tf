# =============================================================
#  asg.tf — EC2 moved to private subnets (#8)
# =============================================================

resource "aws_autoscaling_group" "backend_asg" {
  name = "${var.project_name}-backend-asg"

  desired_capacity = 1
  min_size         = 1
  max_size         = 3

  # #8: Private subnets — EC2 has no public IP, NAT Gateway handles outbound
  vpc_zone_identifier = [
    aws_subnet.private_subnet_1.id,
    aws_subnet.private_subnet_2.id,
  ]

  launch_template {
    id      = aws_launch_template.backend_lt.id
    version = "$Latest"
  }

  target_group_arns = [aws_lb_target_group.backend_tg.arn]

  health_check_type         = "ELB"
  health_check_grace_period = 120
  default_instance_warmup   = 120

  tag {
    key                 = "Name"
    value               = "${var.project_name}-backend"
    propagate_at_launch = true
  }
}

# ── CPU target-tracking ───────────────────────────────────────────────────────

resource "aws_autoscaling_policy" "cpu_target_tracking" {
  name                   = "${var.project_name}-cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.backend_asg.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60.0
  }

  estimated_instance_warmup = 120
}

# ── ALB request-count tracking ────────────────────────────────────────────────

resource "aws_autoscaling_policy" "alb_request_tracking" {
  name                   = "${var.project_name}-alb-request-tracking"
  autoscaling_group_name = aws_autoscaling_group.backend_asg.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.ticket_alb.arn_suffix}/${aws_lb_target_group.backend_tg.arn_suffix}"
    }
    target_value = 800.0
  }

  estimated_instance_warmup = 120
}
