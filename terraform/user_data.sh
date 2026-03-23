#!/bin/bash
set -euxo pipefail
exec > /var/log/user-data.log 2>&1

yum update -y

# Remove conflicting mariadb packages first
yum remove mariadb mariadb-libs -y || true

# Add MySQL 8.0 community repo
yum install https://dev.mysql.com/get/mysql80-community-release-el7-11.noarch.rpm -y
yum-config-manager --enable mysql80-community
yum install mysql-community-client -y

# Install Docker
yum install -y docker
systemctl enable docker
systemctl start docker

# Wait until Docker daemon is ready
until docker info >/dev/null 2>&1; do
  sleep 5
done

usermod -aG docker ec2-user

APP_DIR=/home/ec2-user/ticket-backend
mkdir -p $APP_DIR

# Write .env
#
# USE_HTTPS=false  — The ALB terminates TLS. Node.js runs plain HTTP
#                    on port 3000 inside the VPC. No certs on EC2.
#
# COOKIE_SECURE=true — Cookies are sent over HTTPS (the user's browser
#                      talks HTTPS to the ALB), so Secure flag is correct.
cat <<'ENVEOF'> $APP_DIR/.env
PORT=3000
USE_HTTPS=false
FRONTEND_URL=https://${ALB_DNS}
DB_PORT=3306
DB_HOST=${DB_HOST}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}
EMAIL_USER=${EMAIL_USER}
EMAIL_PASS=${EMAIL_PASS}
AWS_REGION=${AWS_REGION}
S3_BUCKET_NAME=${S3_BUCKET_NAME}
COOKIE_SECURE=true
ENVEOF

chown ec2-user:ec2-user $APP_DIR/.env
chmod 600 $APP_DIR/.env

# Install and configure CloudWatch Agent
yum install -y amazon-cloudwatch-agent

mkdir -p /home/ec2-user/ticket-backend/logs

cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CWEOF'
{
  "agent": {
    "run_as_user": "root"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ec2-user/ticket-backend/logs/app.log",
            "log_group_name": "/ticket-app/backend",
            "log_stream_name": "{instance_id}/app",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S",
            "multi_line_start_pattern": "^\\{"
          },
          {
            "file_path": "/home/ec2-user/ticket-backend/logs/error.log",
            "log_group_name": "/ticket-app/errors",
            "log_stream_name": "{instance_id}/errors",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S",
            "multi_line_start_pattern": "^\\{"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "ticket/EC2",
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_active"],
        "metrics_collection_interval": 60
      },
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["disk_used_percent"],
        "resources": ["/"],
        "metrics_collection_interval": 60
      }
    }
  }
}
CWEOF

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 \
  -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

systemctl enable amazon-cloudwatch-agent

# Login to ECR
aws ecr get-login-password --region ap-south-1 \
| docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com

# Remove old container if exists
docker rm -f ticket-backend || true

# Run container — plain HTTP, no cert mounts needed on EC2.
# The mkcert cert is on the ALB (uploaded to IAM by Terraform).
docker run -d \
  --name ticket-backend \
  --restart always \
  --env-file $APP_DIR/.env \
  -p 3000:3000 \
  -v /home/ec2-user/ticket-backend/logs:/app/logs \
  ${ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/ticket-backend:latest
