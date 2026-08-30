# Deployment

## Docker

`infrastructure/docker/{api,mobile-web,admin}.Dockerfile` — multi-stage
(`deps` → `build` → `runtime`), monorepo root as build context, non-root
runtime user, container healthchecks. `docker-compose.yml` at the repo
root runs `postgres` + `redis` + `api` for local full-stack dev:

```bash
cp .env.example .env    # fill in JWT secrets
docker compose up --build
docker compose exec api npm run prisma:migrate:deploy --workspace apps/api
docker compose exec api npm run prisma:seed --workspace apps/api
```

`mobile-web`/`admin` build the Angular apps and serve them via nginx
(`infrastructure/docker/nginx-spa.conf` — SPA fallback routing, gzip,
cache headers, basic security headers); they aren't in `docker-compose.yml`
because local frontend dev normally runs via `npm run dev:mobile`/
`dev:admin` against the composed API directly, not as a built container.

**What's actually verified here vs. not**: `docker compose config` was run
against a real `.env` and its interpolated output inspected — the compose
file's syntax and env-var wiring are confirmed correct. Actually building
an image (`docker build`/`docker pull`) could not be completed in this
sandbox: the Docker daemon itself starts and runs fine, but base-image
pulls from Docker Hub's blob CDN are rejected by this sandbox's network
egress policy (confirmed by a direct `docker pull node:22-slim`
reproduction, not assumed — see `IMPLEMENTATION_PLAN.md`). CI
(`.github/workflows/ci.yml`'s `docker-build` job) *does* build all three
images for real on every PR, on a GitHub-hosted runner with normal
registry access — that's the actual verification of the Dockerfiles
themselves, this sandbox just isn't where it could run.

## CI/CD — GitHub Actions

`.github/workflows/ci.yml` — every PR and push to `main`, jobs chained in
order: **lint → unit tests → api e2e → build → e2e-critical-flows →
docker-build**. Every step up through the production build and the
Playwright critical-flow suite was independently run for real in this
sandbox and produced the results in `docs/TESTING.md`; only the final
`docker-build` job's actual image builds couldn't run here (network
policy, above) — everything before it was genuinely exercised.

`.github/workflows/deploy.yml` — on push to `main`: runs `ci.yml` as a
reusable workflow, then, **only if the repo has `AWS_DEPLOY_ENABLED`
repository variable set to `"true"`**, builds+pushes images to ECR (OIDC
role assumption, no long-lived AWS keys), runs `terraform plan` and
uploads it as an artifact, then `terraform apply`s it gated behind a
`production` GitHub Environment's manual approval. With no AWS account
attached to this repo, that variable isn't set — pushes to `main` run the
full CI pipeline and then a no-op job posts a clear "not configured"
notice, so `main` stays green rather than red or confusingly skipped. This
is a real, ready-to-use pipeline, not exercised against a live AWS account
from here.

## Infrastructure — Terraform

`infrastructure/terraform/` — VPC (public/private subnets across multiple
AZs, NAT per AZ), RDS PostgreSQL, ElastiCache Redis, ECR repositories, and
an ECS Fargate service + ALB for the `api` image, split into reusable
modules (`modules/{network,database,cache,ecr,ecs_service}`). See its own
`README.md` for the full picture, an example `tfvars`, and — stated
plainly rather than hidden — its known gaps (no autoscaling/WAF/
CloudFront yet, and a documented TODO on wiring the DB password secret
into `DATABASE_URL` via a container entrypoint rather than a plain
interpolated string).

**Not applied**: no `terraform` binary and no AWS credentials in this
sandbox, so this was written and reviewed by hand for correctness, not
`terraform validate`'d or `plan`'d against a real account.

## Environment variables

See `.env.example` for the full annotated list. The ones worth calling out:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL`, `REDIS_URL` | yes | |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | yes | ≥32 chars, must differ from each other and from the checked-in placeholder in production — enforced at boot, see `docs/SECURITY.md` |
| `AI_API_KEY` | no | Unset → `LocalHeuristicAiProvider` fallback, app still fully functional |
| `MAP_API_KEY` | no | Unset → static/list map fallback |
| `SMTP_HOST` | no | Unset → `ConsoleEmailProvider` fallback (logs instead of sending). Set → real SMTP delivery via any vendor (SES, SendGrid, Mailgun, ...), see `docs/SECURITY.md` |
| `CORS_ORIGINS` | yes (prod) | Comma-separated; never a wildcard |
| `API_BASE_URL` | build-time (mobile/admin) | Baked into the Angular build, not runtime-configurable |

## Known limitations (stated plainly)

- No live deployment — no cloud account attached to this session.
- No compiled iOS/Android binaries — no native SDKs in this sandbox;
  Capacitor config and native-project-generation commands are provided and
  documented (`apps/mobile/README.md`), not built or run here.
- No real third-party AI/Maps vendor calls exercised in this sandbox (no
  paid keys here) — the code paths are real and provider-agnostic; whoever
  deploys this sets `AI_API_KEY`/`MAP_API_KEY` to light them up.
- Docker images not actually built in this sandbox (network policy, above)
  — but are built for real in CI.
- Terraform not applied — see above.
