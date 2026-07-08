# =============================================================
# rds.tf
#
# Changes:
#  #6  — RDS moved to private subnets (no internet route)
#  #7  — skip_final_snapshot = false, deletion_protection = true
#  #9  — multi_az = true, backup_retention_period = 7, gp3 storage
#  #10 — RDS Read Replica for read-heavy endpoints
# =============================================================

# ── Subnet group — private subnets only (#6) ─────────────────────────────────

resource "aws_db_subnet_group" "ticket_booking_db_subnet_group" {
  name = "${var.project_name}-db-subnet-group"

  # #6: Use private subnets — RDS has no internet route whatsoever
  subnet_ids = [
    aws_subnet.private_subnet_1.id,
    aws_subnet.private_subnet_2.id,
  ]

  tags = { Name = "${var.project_name}-db-subnet-group" }
}

# ── Primary RDS instance ──────────────────────────────────────────────────────

resource "aws_db_instance" "ticket_booking_db" {
  identifier = "${var.project_name}-mysql-db"

  engine         = "mysql"
  engine_version = "8.0"
  instance_class = "db.t3.micro"

  # #9: gp3 is 20% cheaper than gp2 and has consistent 3000 IOPS baseline
  allocated_storage     = 20
  storage_type          = "gp3"
  max_allocated_storage = 100   # auto-scale storage up to 100 GB

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.ticket_booking_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  publicly_accessible = false

  # #7: Prevent accidental data loss via terraform destroy
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-mysql-final-snapshot"

  # #9: Automated daily backups — 7-day retention window
  backup_retention_period = 7
  backup_window           = "02:00-03:00"   # 2–3 AM UTC (off-peak for India)
  maintenance_window      = "Mon:03:00-Mon:04:00"

  # #9: Multi-AZ for automatic failover — ~60 second RTO on AZ failure
  multi_az = true

  # Performance insights — free tier (7 days retention)
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  tags = { Name = "${var.project_name}-mysql-primary" }
}

# ── Read Replica (#10) ────────────────────────────────────────────────────────
# Offloads read-heavy endpoints: GET /events, GET /reviews, GET /search
# The application reads from replica_endpoint for these queries.
# Writes (bookings, payments) always go to the primary.

resource "aws_db_instance" "ticket_booking_db_replica" {
  identifier = "${var.project_name}-mysql-replica"

  # Replica is created from the primary — no need to specify engine/storage
  replicate_source_db = aws_db_instance.ticket_booking_db.identifier

  instance_class = "db.t3.micro"

  # Replica does NOT need Multi-AZ — it is itself the HA read path
  multi_az            = false
  publicly_accessible = false

  # Replica has its own storage type
  storage_type = "gp3"

  # #7: Protect replica too
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-mysql-replica-final-snapshot"

  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  # Performance insights on replica too
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  tags = { Name = "${var.project_name}-mysql-replica" }
}
