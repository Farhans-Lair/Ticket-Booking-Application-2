# ---------------------------
# RDS Subnet Group
# ---------------------------
resource "aws_db_subnet_group" "ticket_db_subnet_group" {
  name = "${var.project_name}-db-subnet-group"

  subnet_ids = [
    aws_subnet.public_subnet_1.id,
    aws_subnet.public_subnet_2.id
  ]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# ---------------------------
# RDS MySQL Instance
# ---------------------------
resource "aws_db_instance" "ticket_db" {
  identifier = "${var.project_name}-mysql-db"

  engine         = "mysql"
  engine_version = "8.0"

  instance_class = "db.t3.micro"

  allocated_storage = 20
  storage_type      = "gp2"

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.ticket_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  publicly_accessible = false
  skip_final_snapshot = true

  deletion_protection = false

  tags = {
    Name = "${var.project_name}-mysql-db"
  }
}
