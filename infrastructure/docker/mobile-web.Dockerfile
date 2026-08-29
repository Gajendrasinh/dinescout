# DineScout mobile app, built for the web and served as static files.
# This is the web deployment target — iOS/Android are separate Capacitor
# native builds (see apps/mobile/README.md), not part of this image.
#
# Build with the monorepo root as context:
#   docker build -f infrastructure/docker/mobile-web.Dockerfile -t dinescout-web .

FROM node:22-slim AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci --workspace apps/mobile --workspace packages/shared-types --workspace packages/tsconfig --include-workspace-root

COPY packages ./packages
COPY apps/mobile ./apps/mobile
RUN npm run build --workspace packages/shared-types \
 && npm run build:prod --workspace apps/mobile

FROM nginx:1.27-alpine AS runtime
COPY infrastructure/docker/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/mobile/dist/mobile/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
