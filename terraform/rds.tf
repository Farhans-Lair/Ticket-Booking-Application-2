

resource "aws_db_subnet_group" "ticket_booking_db_subnet_group" {
  name = "${var.project_name}-db-subnet-group"

  subnet_ids = [
    aws_subnet.private_subnet_1.id,
    aws_subnet.private_subnet_2.id,
  ]

  tags = { Name = "${var.project_name}-db-subnet-group" }
}

resource "aws_db_instance" "ticket_booking_db" {
  identifier = "${var.project_name}-mysql-db"

  engine         = "mysql"
  engine_version = "8.0"
  instance_class = "db.t3.micro"

  allocated_storage     = 20
  storage_type          = "gp3"
  max_allocated_storage = 100   # auto-scale storage up to 100 GB

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.ticket_booking_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  publicly_accessible = false

  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-mysql-final-snapshot"

  backup_retention_period = 7
  backup_window           = "02:00-03:00"   # 2–3 AM UTC (off-peak for India)
  maintenance_window      = "Mon:03:00-Mon:04:00"

  multi_az = true

  tags = { Name = "${var.project_name}-mysql-primary" }
}

resource "aws_db_instance" "ticket_booking_db_replica" {
  identifier = "${var.project_name}-mysql-replica"

  replicate_source_db = aws_db_instance.ticket_booking_db.identifier

  instance_class = "db.t3.micro"

  multi_az            = false
  publicly_accessible = false

  storage_type = "gp3"

  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-mysql-replica-final-snapshot"

  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  tags = { Name = "${var.project_name}-mysql-replica" }
}
