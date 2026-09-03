
resource "aws_autoscaling_group" "backend_asg" {
  name = "${var.project_name}-backend-asg"

  # Capped at 1 while the ap-south-1 On-Demand Standard vCPU quota
  # (L-1216C47A) is still 1. A t2.micro is 1 vCPU, so exactly one instance
  # fits. Raise max_size back to 3 once the quota increase is approved.
  desired_capacity = 1
  min_size         = 1
  max_size         = 1

  # Pinned to private_subnet_2 (ap-south-1b) only. AWS reported no t2.micro
  # capacity in ap-south-1a, and Terraform aborts on the first failed
  # scaling activity rather than letting the ASG retry in the other AZ.
  # This gives up AZ redundancy — restore private_subnet_1 below once the
  # vCPU quota increase lands and the instance type goes back to t3.micro.
  vpc_zone_identifier = [
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

  # Without this, changes to the launch template (e.g. user_data.sh edits)
  # only apply to new instances — existing running instances keep the old
  # user_data indefinitely until they happen to be replaced. This rolls
  # them through automatically on every apply that changes the template.
  instance_refresh {
    strategy = "Rolling"
    preferences {
      # Must be 0 while max_size = 1. At 50 the refresh needs one healthy
      # instance kept up while a replacement launches, which would push the
      # group to 2 and exceed max_size — the refresh would hang. Set this
      # back to 50 when max_size returns to 3.
      min_healthy_percentage = 0
      instance_warmup        = 120
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-backend"
    propagate_at_launch = true
  }
}

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
