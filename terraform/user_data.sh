#!/bin/bash
yum update -y
amazon-linux-extras install docker -y
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Login to ECR
aws ecr get-login-password --region ap-south-1 \
| docker login --username AWS --password-stdin 680318115068.dkr.ecr.ap-south-1.amazonaws.com

# Run backend container
docker run -d \
  --name ticket-backend \
  -p 3000:3000 \
  --restart always \
  -e DB_HOST=${DB_HOST} \
  -e DB_PORT=3306 \
  -e DB_NAME=${DB_NAME} \
  -e DB_USER=${DB_USER} \
  -e DB_PASSWORD=${DB_PASSWORD} \
  -e JWT_SECRET=${JWT_SECRET} \
  680318115068.dkr.ecr.ap-south-1.amazonaws.com/ticket-backend:latest
