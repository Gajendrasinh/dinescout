provider "aws" {
  region = var.aws_region
}

locals {
  common_tags = merge(var.tags, {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

module "network" {
  source = "./modules/network"

  project     = var.project
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  az_count    = var.availability_zone_count
  tags        = local.common_tags
}

module "database" {
  source = "./modules/database"

  project               = var.project
  environment           = var.environment
  private_subnet_ids    = module.network.private_subnet_ids
  security_group_id     = module.network.data_security_group_id
  instance_class        = var.db_instance_class
  allocated_storage_gb  = var.db_allocated_storage_gb
  multi_az              = var.db_multi_az
  tags                  = local.common_tags
}

module "cache" {
  source = "./modules/cache"

  project             = var.project
  environment         = var.environment
  private_subnet_ids  = module.network.private_subnet_ids
  security_group_id   = module.network.data_security_group_id
  node_type           = var.redis_node_type
  tags                = local.common_tags
}

module "ecr" {
  source = "./modules/ecr"

  project = var.project
  # TODO: drop "mobile-web" and "admin" here (and their ecs_service modules
  # below) if you switch those two apps to static S3 + CloudFront hosting
  # instead of running the nginx image from infrastructure/docker — see
  # README.md. api must stay as an ECR-backed Fargate service either way.
  repository_names = ["api", "mobile-web", "admin"]
  tags              = local.common_tags
}

resource "aws_lb" "this" {
  name               = "${var.project}-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [module.network.alb_security_group_id]
  subnets            = module.network.public_subnet_ids
  tags               = local.common_tags
}

# Plain-HTTP listener. A real deployment terminates TLS here with an ACM
# certificate on a :443 listener and redirects :80 -> :443; left as HTTP-only
# in this skeleton since there's no domain/certificate to attach in this
# sandbox. See docs/DEPLOYMENT.md.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port               = 80
  protocol           = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Not found"
      status_code  = "404"
    }
  }
}

module "api_service" {
  source = "./modules/ecs_service"

  project        = var.project
  environment    = var.environment
  aws_region     = var.aws_region
  service_name    = "api"
  image           = "${module.ecr.repository_urls["api"]}:${var.api_image_tag}"
  container_port  = 3000
  health_check_path = "/health/ready"

  cpu           = var.api_cpu
  memory        = var.api_memory
  desired_count = var.api_desired_count

  environment_variables = {
    NODE_ENV      = var.environment == "prod" ? "production" : var.environment
    API_PREFIX    = "api"
    REDIS_URL     = "redis://${module.cache.primary_endpoint_address}:${module.cache.port}"
    DATABASE_HOST = module.database.address
    DATABASE_PORT = tostring(module.database.port)
    DATABASE_NAME = "dinescout"
    DATABASE_USER = "dinescout"
  }
  # DB password and app secrets (JWT, AI/Maps keys) come from Secrets
  # Manager, never as a plain environment_variables value.
  #
  # KNOWN GAP: aws_secretsmanager_secret_version.db_credentials stores
  # {username, password} as one JSON blob, but ECS's task-definition
  # `secrets[].valueFrom` only maps a whole secret (or a `secret:json-key::`
  # JSON-pointer suffix) to one env var — it can't interpolate that password
  # into a DATABASE_URL string alongside module.database.address. Real fix:
  # either build the connection string in a container entrypoint script that
  # reads DATABASE_PASSWORD and the DB host and exports DATABASE_URL before
  # exec'ing node, or store a second secret containing the full URL. Left as
  # a documented TODO rather than silently wired wrong.
  secret_arns = merge(
    { DATABASE_PASSWORD = "${module.database.credentials_secret_arn}:password::" },
    var.secret_arns,
  )

  vpc_id                 = module.network.vpc_id
  private_subnet_ids     = module.network.private_subnet_ids
  ecs_security_group_id  = module.network.ecs_tasks_security_group_id
  alb_listener_arn       = aws_lb_listener.http.arn
  listener_priority      = 100
  path_patterns          = ["/api/*", "/health/*"]

  tags = local.common_tags
}
