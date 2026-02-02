#!/bin/bash
set -e

yum update -y
amazon-linux-extras install docker -y
systemctl start docker
systemctl enable docker

# Wait for Docker to be ready
until systemctl is-active docker; do
  sleep 5
done

usermod -a -G docker ec2-user

APP_DIR=/home/ec2-user/ticket-backend
mkdir -p $APP_DIR

# .env should already exist OR be created here securely

# Login to ECR
aws ecr get-login-password --region ap-south-1 \
| docker login --username AWS --password-stdin 680318115068.dkr.ecr.ap-south-1.amazonaws.com

# Ensure clean start
docker rm -f ticket-backend || true

# Run backend
docker run -d \
  --name ticket-backend \
  --env-file $APP_DIR/.env \
  -p 3000:3000 \
  --restart always \
  680318115068.dkr.ecr.ap-south-1.amazonaws.com/ticket-backend:latest
