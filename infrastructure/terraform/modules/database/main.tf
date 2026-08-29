# RDS PostgreSQL — the database Prisma migrations target. The master
# password is generated and stored in Secrets Manager rather than passed as
# a plain Terraform variable, so it never lands in state as plaintext input
# (it still lands in state as the resource's computed attribute, which is
# why remote state must be encrypted — see ../../versions.tf).

resource "random_password" "master" {
  length  = 32
  special = false # RDS master password char set is limited; keep it simple.
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.project}-${var.environment}-db-credentials"
  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "dinescout"
    password = random_password.master.result
  })
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.project}-${var.environment}-db-subnets"
  subnet_ids = var.private_subnet_ids
  tags       = var.tags
}

resource "aws_db_instance" "this" {
  identifier     = "${var.project}-${var.environment}-postgres"
  engine         = "postgres"
  engine_version = "16"

  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage_gb
  storage_type          = "gp3"
  storage_encrypted     = true
  db_subnet_group_name  = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.security_group_id]

  db_name  = "dinescout"
  username = "dinescout"
  password = random_password.master.result

  multi_az                  = var.multi_az
  backup_retention_period   = 7
  auto_minor_version_upgrade = true
  deletion_protection       = var.environment == "prod"
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.project}-${var.environment}-final" : null

  tags = var.tags
}
