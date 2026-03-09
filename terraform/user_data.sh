#!/bin/bash
set -euxo pipefail
exec > /var/log/user-data.log 2>&1

yum update -y

# 🔥 Install MySQL 8.0 client
# Remove conflicting mariadb packages first
yum remove mariadb mariadb-libs -y || true

# Add MySQL 8.0 community repo
yum install https://dev.mysql.com/get/mysql80-community-release-el7-11.noarch.rpm -y

# Enable MySQL 8.0 community repo
yum-config-manager --enable mysql80-community

# Install MySQL client only (no server — DB is on RDS)
yum install mysql-community-client -y

# 🔥 Install Docker correctly
yum install -y docker
systemctl enable docker
systemctl start docker

# Wait until Docker daemon is REALLY ready
until docker info >/dev/null 2>&1; do
  sleep 5
done

usermod -aG docker ec2-user

APP_DIR=/home/ec2-user/ticket-backend
mkdir -p $APP_DIR

# 🔥 Write .env using Terraform-injected vars
cat <<'ENVEOF'> $APP_DIR/.env
PORT=3000
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
ENVEOF

chown ec2-user:ec2-user $APP_DIR/.env
chmod 600 $APP_DIR/.env

# Login to ECR
aws ecr get-login-password --region ap-south-1 \
| docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com

# Remove old container if exists
docker rm -f ticket-backend || true

# Run backend container
docker run -d \
  --name ticket-backend \
  --restart always \
  --env-file $APP_DIR/.env \
  -p 3000:3000 \
  ${ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/ticket-backend:latest
