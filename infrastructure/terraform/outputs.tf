output "alb_dns_name" {
  description = "Point your domain's CNAME/ALIAS at this (or front it with CloudFront+ACM for HTTPS)."
  value       = aws_lb.this.dns_name
}

output "ecr_repository_urls" {
  value = module.ecr.repository_urls
}

output "database_address" {
  value = module.database.address
}

output "redis_endpoint" {
  value = module.cache.primary_endpoint_address
}

output "api_ecs_cluster_id" {
  value = module.api_service.cluster_id
}
