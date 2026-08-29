output "target_group_arn" {
  value = aws_lb_target_group.this.arn
}
output "cluster_id" {
  value = local.cluster_id
}
output "service_name" {
  value = aws_ecs_service.this.name
}
