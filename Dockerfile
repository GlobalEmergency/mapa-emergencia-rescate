# Production image for the Next.js app (UI + /api route handlers).
# Multi-stage: install deps -> build (standalone) -> slim non-root runtime.
# Mirrors the Hermes frontend Dockerfile pattern.
FROM node:20-slim AS base
WORKDIR /app

# ---- deps: install with the lockfile only (better layer caching) ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- builder: compile the standalone server ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Commit SHA -> deterministic build id + deploymentId (version-skew protection,
# see next.config.ts). Unset in local builds -> Next falls back to "dev".
ARG APP_BUILD_SHA
ENV APP_BUILD_SHA=$APP_BUILD_SHA
# CDN origin for /_next/static (R2 + Cloudflare custom domain). Baked into the
# bundle at build time so chunks load from the CDN, not the pod — fixes the
# deploy-window version-skew 404 / "Loading…" hang. Unset -> no prefix (assets
# served by the app, same as today). See next.config.ts + static-assets plan.
ARG NEXT_PUBLIC_ASSET_PREFIX
ENV NEXT_PUBLIC_ASSET_PREFIX=$NEXT_PUBLIC_ASSET_PREFIX
# OpenPanel analytics. NEXT_PUBLIC_* is inlined at build, so it MUST be a
# build-arg (a k8s runtime secret would never reach the client bundle).
# The host gate (OpenPanelProduction.tsx) keeps tracking off outside prod.
ARG NEXT_PUBLIC_OPENPANEL_CLIENT_ID
ENV NEXT_PUBLIC_OPENPANEL_CLIENT_ID=$NEXT_PUBLIC_OPENPANEL_CLIENT_ID
ARG NEXT_PUBLIC_OPENPANEL_PRODUCTION_HOST
ENV NEXT_PUBLIC_OPENPANEL_PRODUCTION_HOST=$NEXT_PUBLIC_OPENPANEL_PRODUCTION_HOST
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- worker: BullMQ migration workers (separate Deployment, same image repo) ----
# Carries the FULL node_modules (bullmq, ioredis, pg, @aws-sdk, tsx) + the TS
# worker sources, run directly via tsx (no separate build). Built with
# `--target worker`. Placed BEFORE `runtime` on purpose so `runtime` is the LAST
# stage — a build with no --target then defaults to the app, never the worker.
FROM base AS worker
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY worker ./worker
# Migraciones de esquema: el Job `migrate` (npm run migrate) las aplica con el
# migrator de drizzle-orm en runtime. Necesita los .sql en la imagen.
COPY infra/db/migrations ./infra/db/migrations
USER node
# Default to the worker process; the enqueue Job overrides this command.
CMD ["node", "--import", "tsx", "worker/index.ts"]

# ---- runtime: minimal, non-root (DEFAULT target / app image) ----
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# server.js listens on PORT/HOSTNAME (Next standalone docs). 0.0.0.0 so the
# k8s Service / LB health check can reach it from outside the container.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# node:20-slim ships a non-root `node` user (uid 1000). Use it.
# The standalone server.js + traced node_modules:
COPY --from=builder --chown=node:node /app/.next/standalone ./
# public/ and .next/static are NOT in standalone by default — copy them so
# server.js serves them (Next docs). /_next/static ALSO syncs to the R2 CDN at
# deploy time (assetPrefix points chunks there); these in-image copies stay as
# the origin/fallback and so `public/` is served regardless.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
