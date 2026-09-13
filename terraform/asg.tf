
resource "aws_autoscaling_group" "backend_asg" {
  name = "${var.project_name}-backend-asg"

  # 2 instances minimum, one per AZ, so a single instance or AZ failure
  # never drops capacity to zero.
  desired_capacity = 2
  min_size         = 2
  max_size         = 4

  vpc_zone_identifier = [
    aws_subnet.private_subnet_1.id,
    aws_subnet.private_subnet_2.id,
  ]

  # Three interchangeable 2 vCPU / 1 GB types across two AZs = six placement
  # combinations. If AWS is short on one type in one AZ (the
  # InsufficientInstanceCapacity error), the ASG falls back automatically
  # instead of the launch failing outright.
  #   t3.micro  - Intel, current gen, deepest capacity pool
  #   t3a.micro - AMD, same specs, usually cheaper
  #   t2.micro  - previous gen, last resort
  mixed_instances_policy {
    instances_distribution {
      on_demand_allocation_strategy = "lowest-price"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.backend_lt.id
        version            = "$Latest"
      }

      override {
        instance_type = "t3.micro"
      }

      override {
        instance_type = "t3a.micro"
      }

      override {
        instance_type = "t2.micro"
      }
    }
  }

  target_group_arns = [aws_lb_target_group.backend_tg.arn]

  health_check_type = "ELB"

  # 600s, not 120s. The bootstrap runs yum update, installs Docker and the
  # CloudWatch agent, then pulls the Node image from ECR over NAT — 5-10
  # minutes realistically. At 120s the ASG killed instances mid-setup and
  # looped forever without one ever reaching InService.
  health_check_grace_period = 600
  default_instance_warmup   = 600

  # Without this, changes to the launch template (e.g. user_data.sh edits)
  # only apply to new instances — existing running instances keep the old
  # user_data indefinitely until they happen to be replaced. This rolls
  # them through automatically on every apply that changes the template.
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
      instance_warmup        = 600
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
