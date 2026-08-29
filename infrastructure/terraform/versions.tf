terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state by default so a first `terraform plan` needs nothing but AWS
  # credentials. For real team/CI use, uncomment and point this at an S3
  # bucket + DynamoDB lock table created out-of-band (Terraform can't create
  # its own remote-state backend on the first run).
  #
  # backend "s3" {
  #   bucket         = "dinescout-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "dinescout-terraform-locks"
  #   encrypt        = true
  # }
}
