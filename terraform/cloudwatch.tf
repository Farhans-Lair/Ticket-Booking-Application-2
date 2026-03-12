# ============================================================
# CloudWatch — Log Groups
# ============================================================

resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/ticket-app/backend"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-app-logs"
  }
}

resource "aws_cloudwatch_log_group" "error_logs" {
  name              = "/ticket-app/errors"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-error-logs"
  }
}

# ============================================================
# SNS — Alert topic and email subscription
# ============================================================

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts"
}

resource "aws_sns_topic_subscription" "email_alert" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ============================================================
# CloudWatch Alarms
# ============================================================

# --- ALB: high 5xx errors (booking / payment routes failing) ---
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.project_name}-alb-5xx-errors"
  alarm_description   = "High 5xx errors on ALB — booking or payment routes may be failing"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10

  dimensions = {
    LoadBalancer = aws_lb.ticket_alb.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# --- ALB: no healthy backend instances (site is down) ---
resource "aws_cloudwatch_metric_alarm" "asg_healthy_hosts" {
  alarm_name          = "${var.project_name}-no-healthy-hosts"
  alarm_description   = "Zero healthy EC2 hosts behind ALB — application is down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 1

  dimensions = {
    TargetGroup  = aws_lb_target_group.backend_tg.arn_suffix
    LoadBalancer = aws_lb.ticket_alb.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# --- RDS: high CPU (slow queries under booking load) ---
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.project_name}-rds-high-cpu"
  alarm_description   = "RDS CPU above 80% — possible slow queries or connection storm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.ticket_db.identifier
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# --- RDS: low free storage (base64 LONGTEXT images fill disk fast) ---
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "${var.project_name}-rds-low-storage"
  alarm_description   = "RDS free storage below 2GB — expand storage or move images to S3"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 2000000000 # 2 GB in bytes

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.ticket_db.identifier
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# --- RDS: too many DB connections (Sequelize pool exhausted) ---
resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${var.project_name}-rds-high-connections"
  alarm_description   = "RDS connection count is high — Sequelize pool may be exhausted"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 40 # db.t3.micro max_connections ~66

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.ticket_db.identifier
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# --- Error log metric filter + alarm (payment failures logged by app) ---
resource "aws_cloudwatch_log_metric_filter" "payment_errors" {
  name           = "${var.project_name}-payment-errors"
  log_group_name = aws_cloudwatch_log_group.error_logs.name
  pattern        = "{ $.message = \"Payment verification flow failed\" }"

  metric_transformation {
    name      = "PaymentVerificationErrors"
    namespace = "${var.project_name}/App"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "payment_error_alarm" {
  alarm_name          = "${var.project_name}-payment-errors"
  alarm_description   = "Payment verification failures detected in application logs"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "PaymentVerificationErrors"
  namespace           = "${var.project_name}/App"
  period              = 60
  statistic           = "Sum"
  threshold           = 3
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# --- Booking confirmation metric filter (revenue tracking) ---
resource "aws_cloudwatch_log_metric_filter" "bookings_confirmed" {
  name           = "${var.project_name}-bookings-confirmed"
  log_group_name = aws_cloudwatch_log_group.app_logs.name
  pattern        = "{ $.message = \"Booking confirmed\" }"

  metric_transformation {
    name      = "BookingsConfirmed"
    namespace = "${var.project_name}/App"
    value     = "1"
  }
}

# ============================================================
# CloudWatch Dashboard
# ============================================================

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "ALB — Request Count & 5xx Errors"
          region = var.aws_region
          metrics = [
            ["AWS/ApplicationELB", "RequestCount",               "LoadBalancer", aws_lb.ticket_alb.arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count",  "LoadBalancer", aws_lb.ticket_alb.arn_suffix],
            ["AWS/ApplicationELB", "TargetResponseTime",         "LoadBalancer", aws_lb.ticket_alb.arn_suffix]
          ]
          period = 60
          stat   = "Sum"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "ALB — Healthy Host Count"
          region = var.aws_region
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount", "TargetGroup", aws_lb_target_group.backend_tg.arn_suffix, "LoadBalancer", aws_lb.ticket_alb.arn_suffix]
          ]
          period = 60
          stat   = "Average"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "RDS — CPU & DB Connections"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "CPUUtilization",      "DBInstanceIdentifier", aws_db_instance.ticket_db.identifier],
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.ticket_db.identifier]
          ]
          period = 60
          stat   = "Average"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "RDS — Free Storage Space"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", aws_db_instance.ticket_db.identifier]
          ]
          period = 300
          stat   = "Average"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "App — Bookings Confirmed vs Payment Errors"
          region = var.aws_region
          metrics = [
            ["${var.project_name}/App", "BookingsConfirmed"],
            ["${var.project_name}/App", "PaymentVerificationErrors"]
          ]
          period = 300
          stat   = "Sum"
          view   = "timeSeries"
        }
      },
      {
        type   = "log"
        width  = 24
        height = 6
        properties = {
          title = "Recent Application Errors (last 3 hours)"
          query = "SOURCE '/ticket-app/errors' | fields @timestamp, message, userId, eventId, error | sort @timestamp desc | limit 50"
          view  = "table"
        }
      }
    ]
  })
}
