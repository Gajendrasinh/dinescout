output "endpoint" {
  value = aws_db_instance.this.endpoint
}
output "address" {
  value = aws_db_instance.this.address
}
output "port" {
  value = aws_db_instance.this.port
}
output "credentials_secret_arn" {
  value = aws_secretsmanager_secret.db_credentials.arn
}
