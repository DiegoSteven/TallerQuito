# syntax=docker/dockerfile:1
# Construir desde la raíz del repo:  docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && apk add --no-cache openssl
WORKDIR /repo

# ---------- dependencias + compilación ----------
FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @taller/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @taller/shared build \
 && pnpm --filter @taller/api exec prisma generate \
 && pnpm --filter @taller/api build \
 && pnpm deploy --filter @taller/api --prod --legacy /out \
 && cp -r apps/api/dist apps/api/prisma /out/ \
 && cd /out && ./node_modules/.bin/prisma generate

# ---------- imagen final, solo lo necesario ----------
FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl tini
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
# Aplica migraciones pendientes y arranca.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main"]
