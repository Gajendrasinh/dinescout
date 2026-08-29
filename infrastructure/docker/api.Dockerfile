# DineScout API — build with the monorepo root as context:
#   docker build -f infrastructure/docker/api.Dockerfile -t dinescout-api .
#
# Multi-stage: install+build in a full Node image, run on a slim one as a
# non-root user. Needs the whole workspace at build time (npm workspaces
# resolve @dinescout/shared-types via the root node_modules symlink).

# ── deps ──────────────────────────────────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/api/package.json apps/api/
RUN npm ci --workspace apps/api --workspace packages/shared-types --workspace packages/tsconfig --include-workspace-root

# ── build ─────────────────────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /workspace
COPY --from=deps /workspace/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm run build --workspace packages/shared-types \
 && npx --workspace apps/api prisma generate \
 && npm run build --workspace apps/api

# ── runtime ───────────────────────────────────────────────────────────
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /workspace

# Re-install only production dependencies for a lean final image.
COPY package.json package-lock.json ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev --workspace apps/api --workspace packages/shared-types --include-workspace-root \
 && npm cache clean --force

COPY --from=build /workspace/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/prisma ./apps/api/prisma
# Prisma's generated client (query engine binary + JS) lives under the
# workspace root node_modules/@prisma and node_modules/.prisma — pull the
# already-generated one from the build stage rather than regenerating.
COPY --from=build /workspace/node_modules/.prisma ./node_modules/.prisma

RUN groupadd --system --gid 1001 dinescout \
 && useradd --system --uid 1001 --gid dinescout dinescout \
 && chown -R dinescout:dinescout /workspace
USER dinescout

WORKDIR /workspace/apps/api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health/live', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]
