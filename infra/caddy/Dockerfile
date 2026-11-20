# syntax=docker/dockerfile:1
# Compila la web (React) y la sirve con Caddy, que además hace de proxy a la API.
# Construir desde la raíz del repo:  docker build -f infra/caddy/Dockerfile .

FROM node:22-alpine AS web
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @taller/web...
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @taller/shared build && pnpm --filter @taller/web build

FROM caddy:2.10-alpine
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=web /repo/apps/web/dist /srv
