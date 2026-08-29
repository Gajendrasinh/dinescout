# DineScout — Terraform infrastructure (skeleton, not applied)

This is infrastructure-as-code for a real AWS deployment of DineScout: VPC,
RDS PostgreSQL, ElastiCache Redis, ECR repositories, and an ECS Fargate
cluster running the `api` service behind an Application Load Balancer, with
the `mobile-web` and `admin` static SPAs served from S3 + CloudFront.

**Status: written and reviewed for correctness, not applied.** This sandbox
has no AWS credentials and no `terraform` binary (see the environment facts
in `../../IMPLEMENTATION_PLAN.md`), so `terraform init`/`plan`/`apply` have
not been run against it. Treat it as a documented starting point, not a
verified deployment — review resource sizing, IAM policies, and cost before
applying it to a real account.

## Layout

```
infrastructure/terraform/
├── main.tf          # provider, root module wiring
├── variables.tf      # root input variables
├── outputs.tf        # root outputs (ALB DNS, ECR URLs, RDS/Redis endpoints)
├── versions.tf        # required_providers + version pins
└── modules/
    ├── network/       # VPC, public/private subnets, NAT, security groups
    ├── database/      # RDS PostgreSQL (single instance, Multi-AZ optional)
    ├── cache/          # ElastiCache Redis replication group
    ├── ecr/            # container repositories (api, mobile-web, admin)
    └── ecs_service/     # reusable Fargate service + ALB target group module
```

## How this maps to the Dockerfiles

- `modules/ecr` creates one repository per image built by
  `infrastructure/docker/{api,mobile-web,admin}.Dockerfile`.
- The `api` ECS service (root `main.tf`) runs the `api` image behind the ALB,
  reading `DATABASE_URL` / `REDIS_URL` from the `database`/`cache` module
  outputs via Secrets Manager (see `modules/ecs_service/main.tf`).
- `mobile-web` and `admin` are static nginx images; in this skeleton they're
  deployed the same way as `api` (an ECS Fargate service per app) for
  consistency, since that's what the Dockerfiles already produce. A cheaper
  alternative — build the Angular apps and push `dist/**/browser` straight to
  S3 + CloudFront instead of running nginx in a container — is noted as a
  TODO in `main.tf` and would remove two of the three Fargate services.

## Applying this for real

```bash
cd infrastructure/terraform
terraform init
terraform plan  -var-file=envs/prod.tfvars   # create envs/prod.tfvars first, see variables.tf
terraform apply -var-file=envs/prod.tfvars
```

You will need:
- AWS credentials with permission to create VPC/RDS/ElastiCache/ECS/ECR/IAM
  resources.
- A remote state backend (S3 + DynamoDB lock table) configured in
  `versions.tf`'s commented-out `backend "s3"` block — local state is fine
  for a first `plan` but not for a real team/CI workflow.
- Secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `AI_API_KEY`,
  `MAP_API_KEY`) created out-of-band in AWS Secrets Manager and referenced by
  ARN via `var.secret_arns` — this code does not generate or store secret
  values itself.

## Known gaps (honest, not hidden)

- No autoscaling policies yet (fixed `desired_count` per service).
- No WAF / CloudFront in front of the ALB.
- No CI/CD wiring from Terraform to the GitHub Actions workflows in
  `.github/workflows/` — deployment triggering is documented in
  `docs/DEPLOYMENT.md`, not automated here.
- Single-region only.
