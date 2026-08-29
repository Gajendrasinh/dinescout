# ElastiCache Redis — used by the api for rate-limiting counters, refresh
# -token-family tracking, and response caching (see apps/api/src/redis).

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.project}-${var.environment}-redis-subnets"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = "${var.project}-${var.environment}-redis"
  description           = "DineScout Redis (${var.environment})"

  engine         = "redis"
  engine_version = "7.1"
  node_type      = var.node_type

  num_cache_clusters = var.environment == "prod" ? 2 : 1
  automatic_failover_enabled = var.environment == "prod"

  subnet_group_name = aws_elasticache_subnet_group.this.name
  security_group_ids = [var.security_group_id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = var.tags
}
