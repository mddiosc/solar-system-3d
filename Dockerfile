# ============================================================
# Stage 1: Builder
# ============================================================
# node:24.18.0-alpine3.24 (multi-arch manifest-list digest, amd64+arm64+s390x)
FROM node:24.18.0-alpine3.24@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd AS builder

# Upgrade all system packages to latest patched versions
RUN apk upgrade --no-cache

# Install pnpm (must match the pnpm version used in the repo)
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /app

# Copy dependency manifests first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code and build the static site (output: dist/)
# This is a fully static Astro site with no runtime env vars.
COPY . .
RUN pnpm run build

# ============================================================
# Stage 2: Production server
# ============================================================
# nginxinc/nginx-unprivileged: runs as non-root (uid 101),
# Alpine base, minimal attack surface for static file serving
# nginxinc/nginx-unprivileged:1.31.2-alpine3.23 (multi-arch manifest-list digest, amd64+arm64+arm/v7+ppc64le+s390x+riscv64)
FROM nginxinc/nginx-unprivileged:1.31.2-alpine3.23@sha256:054e14f543eb688809d59ec2ad1644d1a61678e247c87a318ad605977eb37eaf AS production

USER root
RUN apk upgrade --no-cache && rm -rf /var/cache/apk/*
USER nginx

# Copy custom nginx config
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder stage
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# nginx-unprivileged listens on 8080 by default (non-root port)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
