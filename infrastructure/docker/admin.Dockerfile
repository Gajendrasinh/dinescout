# DineScout admin console — static build served by nginx.
# Build with the monorepo root as context:
#   docker build -f infrastructure/docker/admin.Dockerfile -t dinescout-admin .

FROM node:22-slim AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/admin/package.json apps/admin/
RUN npm ci --workspace apps/admin --workspace packages/shared-types --workspace packages/tsconfig --include-workspace-root

COPY packages ./packages
COPY apps/admin ./apps/admin
RUN npm run build --workspace packages/shared-types \
 && npm run build:prod --workspace apps/admin

FROM nginx:1.27-alpine AS runtime
COPY infrastructure/docker/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/admin/dist/admin/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
