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
variable "instance_class" {
  type = string
}
variable "allocated_storage_gb" {
  type = number
}
variable "multi_az" {
  type = bool
}
variable "tags" {
  type    = map(string)
  default = {}
}
