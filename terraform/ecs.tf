# =============================================================================
# Piezas de red compartidas entre ECS y RDS.
# =============================================================================

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "publicas" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "map-public-ip-on-launch"
    values = ["true"]
  }
}

/*DELETED BECAUSE LAB'S DEFAULT VPC ALREADY HAD 0.0.0.0/0 ROUTE
# La VPC por defecto de este lab tiene el internet gateway adjunto, pero SIN
# la ruta 0.0.0.0/0. Sin esto, ECS no puede bajar la imagen de ECR.
data "aws_route_table" "principal" {
  vpc_id = data.aws_vpc.default.id
  filter {
    name   = "association.main"
    values = ["true"]
  }
}

data "aws_internet_gateway" "default" {
  filter {
    name   = "attachment.vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_route" "salida_a_internet" {
  route_table_id         = data.aws_route_table.principal.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id              = data.aws_internet_gateway.default.id
}*/



# Quien puede llamar al backend en el 8080. Se usa tambien desde rds.tf, como
# origen autorizado a conectar a Postgres.
resource "aws_security_group" "tarea" {
  name        = "dsy1107-backend-${var.estudiante}"
  description = "Backend en Fargate: 8080 abierto, sin balanceador delante"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

//code from here is after backend ran fully functional
# El ID de la cuenta se pregunta en vez de quemarse: asi el archivo sirve en
# el lab de cualquiera.
data "aws_caller_identity" "actual" {}

# -----------------------------------------------------------------------------
# El registro de la imagen.
# -----------------------------------------------------------------------------
resource "aws_ecr_repository" "backend" {
  name         = "dsy1107-backend-${var.estudiante}"
  force_delete = true

  image_scanning_configuration {
    scan_on_push = false
  }
}

# -----------------------------------------------------------------------------
# Los logs.
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/dsy1107-backend-${var.estudiante}"
  retention_in_days = 7
}

# -----------------------------------------------------------------------------
# Cluster, task definition, servicio.
# -----------------------------------------------------------------------------
resource "aws_ecs_cluster" "backend" {
  name = "dsy1107-backend-${var.estudiante}"
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "dsy1107-backend-${var.estudiante}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024

  execution_role_arn = "arn:aws:iam::${data.aws_caller_identity.actual.account_id}:role/LabRole"

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:latest"
      essential = true

      portMappings = [
        { containerPort = 8080, protocol = "tcp" }
      ]

      environment = [
        { name = "BACKEND_MINDICADOR_TTL", value = "10m" },
        {
          name  = "SPRING_DATASOURCE_URL"
          value = "jdbc:postgresql://${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}?sslmode=require"
        },
        { name = "SPRING_DATASOURCE_USERNAME", value = aws_db_instance.postgres.username },
        { name = "SPRING_DATASOURCE_PASSWORD", value = var.db_password }
      ]

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "backend" {
  name            = "dsy1107-backend-${var.estudiante}"
  cluster         = aws_ecs_cluster.backend.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.publicas.ids
    security_groups  = [aws_security_group.tarea.id]
    assign_public_ip = true
  }

  wait_for_steady_state = false

  lifecycle {
    ignore_changes = [task_definition]
  }
}

output "ecs_repositorio" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecs_cluster" {
  value = aws_ecs_cluster.backend.name
}

output "ecs_servicio" {
  value = aws_ecs_service.backend.name
}

output "ecs_logs" {
  value = "aws logs tail ${aws_cloudwatch_log_group.backend.name} --follow"
}