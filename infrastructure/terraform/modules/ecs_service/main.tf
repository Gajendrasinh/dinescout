# A single Fargate service behind its own ALB target group + listener rule.
# Reused for the api service; the same module could take mobile-web/admin's
# images too (see infrastructure/terraform/README.md's S3+CloudFront note
# for why that's not the default for those two).

resource "aws_ecs_cluster" "this" {
  count = var.create_cluster ? 1 : 0
  name  = "${var.project}-${var.environment}"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = var.tags
}

locals {
  cluster_id = var.create_cluster ? aws_ecs_cluster.this[0].id : var.existing_cluster_id
}

resource "aws_iam_role" "execution" {
  name_prefix        = "${var.project}-${var.environment}-${var.service_name}-exec-"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags               = var.tags
}

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Execution role also needs to read the secrets referenced in container_secrets.
resource "aws_iam_role_policy" "execution_secrets" {
  count = length(var.secret_arns) > 0 ? 1 : 0
  name  = "read-secrets"
  role  = aws_iam_role.execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = values(var.secret_arns)
    }]
  })
}

resource "aws_iam_role" "task" {
  name_prefix        = "${var.project}-${var.environment}-${var.service_name}-task-"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags               = var.tags
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.project}-${var.environment}-${var.service_name}"
  retention_in_days = 30
  tags              = var.tags
}

resource "aws_ecs_task_definition" "this" {
  family                   = "${var.project}-${var.environment}-${var.service_name}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name      = var.service_name
    image     = var.image
    essential = true
    portMappings = [{
      containerPort = var.container_port
      protocol      = "tcp"
    }]
    environment = [for k, v in var.environment_variables : { name = k, value = v }]
    secrets     = [for k, arn in var.secret_arns : { name = k, valueFrom = arn }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.this.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = var.service_name
      }
    }
  }])

  tags = var.tags
}

resource "aws_lb_target_group" "this" {
  name        = "${var.project}-${substr(var.environment, 0, 4)}-${var.service_name}"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = var.health_check_path
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 15
    timeout             = 5
  }

  tags = var.tags
}

resource "aws_lb_listener_rule" "this" {
  listener_arn = var.alb_listener_arn
  priority     = var.listener_priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }

  condition {
    path_pattern {
      values = var.path_patterns
    }
  }
}

resource "aws_ecs_service" "this" {
  name            = "${var.project}-${var.environment}-${var.service_name}"
  cluster         = local.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [var.ecs_security_group_id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name    = var.service_name
    container_port    = var.container_port
  }

  depends_on = [aws_lb_listener_rule.this]
  tags       = var.tags
}
