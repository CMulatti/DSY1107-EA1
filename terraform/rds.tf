resource "aws_db_subnet_group" "postgres" {
  name        = "dsy1107-db-${var.estudiante}"
  description = "Subredes publicas de la VPC por defecto"
  subnet_ids  = data.aws_subnets.publicas.ids
}

resource "aws_security_group" "postgres" {
  name        = "dsy1107-db-${var.estudiante}"
  description = "PostgreSQL: 5432 desde el backend en ECS y desde el cliente del estudiante"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "5432 desde la task de ECS, por dentro de la VPC"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.tarea.id]
  }

  ingress {
    description = "5432 desde los origenes autorizados"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.origenes_postgres
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "postgres" {
  identifier = "dsy1107-db-${var.estudiante}"

  engine         = "postgres"
  engine_version = var.db_version
  instance_class = var.db_instancia

  db_name  = var.db_nombre
  username = var.db_usuario
  password = var.db_password
  port     = 5432

  storage_type          = "gp3"
  allocated_storage     = var.db_almacenamiento_gb
  max_allocated_storage = 0
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [aws_security_group.postgres.id]

  publicly_accessible = true
  multi_az             = false

  backup_retention_period  = 0
  skip_final_snapshot      = true
  delete_automated_backups = true
  deletion_protection      = false

  monitoring_interval          = 0
  performance_insights_enabled = false

  apply_immediately          = true
  auto_minor_version_upgrade = true
}

output "db_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "db_jdbc_url" {
  value = "jdbc:postgresql://${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}?sslmode=require"
}

output "db_usuario" {
  value = aws_db_instance.postgres.username
}