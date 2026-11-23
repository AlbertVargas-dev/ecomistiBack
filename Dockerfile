# syntax=docker/dockerfile:1

FROM node:24-slim AS base

# OpenSSL y certificados requeridos por los engines de Prisma 6
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# --- Etapa de dependencias y compilación ---
FROM base AS builder

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# prisma.config.ts exige DATABASE_URL definida incluso durante prisma generate
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm exec prisma generate
RUN pnpm run build

# --- Etapa final de ejecución ---
FROM base AS runner

ENV NODE_ENV=production

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
