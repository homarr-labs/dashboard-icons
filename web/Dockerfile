# syntax=docker/dockerfile:1
FROM node:24-alpine AS base

# Immutable multi-platform image; keep its version aligned with backend/pocketbase-release.json.
FROM ghcr.io/muchobien/pocketbase:0.40.5@sha256:618171d6df039ab3edd74ef9e6b89d43ec836fd55f5437017b7ed3790e627ab0 AS pocketbase

FROM caddy:2.11.2-alpine AS caddy

FROM base AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat && corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_DISABLE_POSTHOG=true
ARG NEXT_PUBLIC_POCKETBASE_URL=/pb
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY} \
    NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST} \
    NEXT_PUBLIC_DISABLE_POSTHOG=${NEXT_PUBLIC_DISABLE_POSTHOG} \
    NEXT_PUBLIC_POCKETBASE_URL=${NEXT_PUBLIC_POCKETBASE_URL} \
    PB_URL=http://127.0.0.1:8090 \
    PRERENDER_ICON_PAGES=false
COPY --from=deps /app/node_modules ./node_modules
COPY --from=pocketbase /usr/local/bin/pocketbase /pb/pocketbase
COPY . .
# Build against an isolated database, never a production PocketBase instance.
RUN --mount=type=secret,id=github_token \
    if [ -f /run/secrets/github_token ]; then export GITHUB_TOKEN="$(cat /run/secrets/github_token)"; fi; \
    /pb/pocketbase serve --http=127.0.0.1:8090 --dir=/tmp/pb_data --hooksDir=/app/backend/pb_hooks --migrationsDir=/app/backend/pb_migrations >/tmp/pb-build.log 2>&1 & pb_pid=$!; \
    trap 'kill "$pb_pid" 2>/dev/null || true' EXIT; \
    node -e 'async function ready() { for (let n=0;n<60;n++) { try { const r=await fetch("http://127.0.0.1:8090/api/health"); if(r.ok) return; } catch {} await new Promise(r=>setTimeout(r,1000)); } process.exit(1); } ready()' \
    || { sed '/pbinstal/d' /tmp/pb-build.log; exit 1; }; \
    npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PB_URL=http://127.0.0.1:8090 \
    PORT=3000 \
    HOSTNAME=127.0.0.1 \
    XDG_CONFIG_HOME=/tmp/caddy/config \
    XDG_DATA_HOME=/tmp/caddy/data
RUN apk add --no-cache bash ca-certificates curl tini \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs \
    && mkdir -p /pb/pb_data \
    && chown -R nextjs:nodejs /pb
COPY --from=caddy /usr/bin/caddy /usr/bin/caddy
COPY --from=pocketbase /usr/local/bin/pocketbase /pb/pocketbase
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs backend/pb_hooks /pb/pb_hooks
COPY --chown=nextjs:nodejs backend/pb_migrations /pb/pb_migrations
COPY --chown=nextjs:nodejs backend/pocketbase-release.json /pb/pocketbase-release.json
# Store outside the migration directory so an outdated bind mount cannot hide the required filename.
RUN node -e 'const fs = require("node:fs"); const files = fs.readdirSync("/pb/pb_migrations").filter(f => f.endsWith(".js")).sort(); if (!files.length) throw new Error("No PocketBase migrations packaged"); fs.writeFileSync("/pb/required-migration", files.at(-1) + "\n")'
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --chmod=755 docker/start.sh /usr/local/bin/start-dashboard
USER nextjs
VOLUME /pb/pb_data
EXPOSE 8080 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD if [ "${SERVICE_MODE:-all}" = "backend" ]; then \
          curl -fsS http://127.0.0.1:8090/api/health >/dev/null; \
        else \
          curl -fsS http://127.0.0.1:8080/pb/api/health >/dev/null && curl -fsS http://127.0.0.1:8080/api/health >/dev/null; \
        fi || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/local/bin/start-dashboard"]
