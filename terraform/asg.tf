# =============================================================
#  asg.tf — Auto Scaling Group + CPU-based scaling policies
#
#  Optimization: original had no scaling policies — the ASG
#  was stuck at desired_capacity=1 forever. Added target-
#  tracking policy so EC2 scales out when CPU > 60% and
#  scales in when load drops, saving cost automatically.
# =============================================================

resource "aws_autoscaling_group" "backend_asg" {
  name = "${var.project_name}-backend-asg"

  desired_capacity = 1
  min_size         = 1
  max_size         = 3   # raised from 2 → 3 to handle event-day spikes

  vpc_zone_identifier = [
    aws_subnet.public_subnet_1.id,
    aws_subnet.public_subnet_2.id
  ]

  launch_template {
    id      = aws_launch_template.backend_lt.id
    version = "$Latest"
  }

  target_group_arns = [
    aws_lb_target_group.backend_tg.arn
  ]

  health_check_type         = "ELB"
  health_check_grace_period = 120

  # Allow time for instance warm-up before CloudWatch metrics kick in
  default_instance_warmup = 120

  tag {
    key                 = "Name"
    value               = "${var.project_name}-backend"
    propagate_at_launch = true
  }
}

# ── Target-Tracking Scaling Policy — CPU ──────────────────────────────────────
# Maintains average CPU at 60%. At that setpoint, a t3.micro can handle normal
# traffic and still have headroom before the next instance launches (~3 min).
resource "aws_autoscaling_policy" "cpu_target_tracking" {
  name                   = "${var.project_name}-cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.backend_asg.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60.0

    # Scale-in cooldown: wait 5 min after scale-in so we don't thrash
    # Scale-out can fire immediately (disable_scale_in = false by default)
  }

  estimated_instance_warmup = 120
}

# ── Target-Tracking Scaling Policy — ALB Request Count ───────────────────────
# Secondary signal: add capacity if each instance is handling > 800 req/min.
# This catches traffic spikes that haven't yet pushed CPU above 60%.
resource "aws_autoscaling_policy" "alb_request_tracking" {
  name                   = "${var.project_name}-alb-request-tracking"
  autoscaling_group_name = aws_autoscaling_group.backend_asg.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label = "${aws_lb.ticket_alb.arn_suffix}/${aws_lb_target_group.backend_tg.arn_suffix}"
    }
    target_value = 800.0
  }

  estimated_instance_warmup = 120
}
