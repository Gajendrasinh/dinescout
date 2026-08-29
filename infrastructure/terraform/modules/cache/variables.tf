variable "project" {
  type = string
}
variable "environment" {
  type = string
}
variable "private_subnet_ids" {
  type = list(string)
}
variable "security_group_id" {
  type = string
}
variable "node_type" {
  type = string
}
variable "tags" {
  type    = map(string)
  default = {}
}
