<<<<<<< HEAD
# =============================================================
#  terraform/security-groups.tf
# =============================================================

=======
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
# ---------------------------
# ALB Security Group
# ---------------------------
resource "aws_security_group" "alb_sg" {
  name        = "${var.project_name}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.ticket_vpc.id

<<<<<<< HEAD
  # HTTP — redirected to HTTPS by the listener (port 80 → 443)
=======
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
  ingress {
    description = "Allow HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

<<<<<<< HEAD
  # HTTPS — primary traffic; ALB terminates TLS here
  ingress {
    description = "Allow HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

=======
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

# ---------------------------
# Backend EC2 Security Group
<<<<<<< HEAD
# EC2 only accepts traffic from the ALB — never the public internet.
=======
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
# ---------------------------
resource "aws_security_group" "backend_sg" {
  name        = "${var.project_name}-backend-sg"
  description = "Security group for backend EC2 instances"
  vpc_id      = aws_vpc.ticket_vpc.id

  ingress {
<<<<<<< HEAD
    description     = "Allow HTTP from ALB only"
=======
    description     = "Allow traffic from ALB"
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }
<<<<<<< HEAD

=======
  
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-backend-sg"
  }
}

# ---------------------------
# RDS MySQL Security Group
# ---------------------------
resource "aws_security_group" "rds_sg" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for RDS MySQL"
  vpc_id      = aws_vpc.ticket_vpc.id

  ingress {
    description     = "Allow MySQL from backend EC2"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.backend_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}
