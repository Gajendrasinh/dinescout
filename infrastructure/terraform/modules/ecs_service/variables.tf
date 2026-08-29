variable "project" {
  type = string
}
variable "environment" {
  type = string
}
variable "aws_region" {
  type = string
}
variable "service_name" {
  type = string
}
variable "image" {
  type = string
}
variable "container_port" {
  type = number
}
variable "health_check_path" {
  type    = string
  default = "/"
}
variable "cpu" {
  type = number
}
variable "memory" {
  type = number
}
variable "desired_count" {
  type = number
}
variable "environment_variables" {
  type    = map(string)
  default = {}
}
variable "secret_arns" {
  type    = map(string)
  default = {}
}
variable "vpc_id" {
  type = string
}
variable "private_subnet_ids" {
  type = list(string)
}
variable "ecs_security_group_id" {
  type = string
}
variable "alb_listener_arn" {
  type = string
}
variable "listener_priority" {
  type = number
}
variable "path_patterns" {
  type    = list(string)
  default = ["/*"]
}
variable "create_cluster" {
  description = "Create a new ECS cluster for this service. Set false and pass existing_cluster_id to share a cluster across services."
  type        = bool
  default     = true
}
variable "existing_cluster_id" {
  type    = string
  default = null
}
variable "tags" {
  type    = map(string)
  default = {}
}
