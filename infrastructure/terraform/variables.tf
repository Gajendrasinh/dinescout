variable "project" {
  description = "Short project name used as a resource-name prefix."
  type        = string
  default     = "dinescout"
}

variable "environment" {
  description = "Deployment environment name (e.g. staging, prod)."
  type        = string
}

variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "availability_zone_count" {
  description = "Number of AZs to spread public/private subnets across."
  type        = number
  default     = 2
}

variable "db_instance_class" {
  description = "RDS instance class for PostgreSQL."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage_gb" {
  description = "RDS allocated storage in GB."
  type        = number
  default     = 20
}

variable "db_multi_az" {
  description = "Whether RDS should run Multi-AZ (recommended for prod, costs more)."
  type        = bool
  default     = false
}

variable "redis_node_type" {
  description = "ElastiCache node type for Redis."
  type        = string
  default     = "cache.t4g.micro"
}

variable "api_image_tag" {
  description = "Tag of the api image (from infrastructure/docker/api.Dockerfile) to deploy."
  type        = string
  default     = "latest"
}

variable "api_desired_count" {
  description = "Number of api Fargate tasks to run."
  type        = number
  default     = 2
}

variable "api_cpu" {
  description = "Fargate task CPU units for the api service."
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Fargate task memory (MiB) for the api service."
  type        = number
  default     = 1024
}

variable "secret_arns" {
  description = <<-EOT
    ARNs of pre-created AWS Secrets Manager secrets, keyed by the env var
    name the api container should receive them as (e.g. JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET, AI_API_KEY, MAP_API_KEY). This module reads secrets,
    it does not create or store secret values.
  EOT
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Common tags applied to all resources."
  type        = map(string)
  default     = {}
}
