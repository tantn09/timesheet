# syntax=docker/dockerfile:1
# Build context is the repo root (pnpm workspace).
FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.30.1
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY timesheet-be/package.json timesheet-be/package.json
COPY timesheet-fe/package.json timesheet-fe/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY timesheet-be timesheet-be
RUN pnpm --filter api exec prisma generate && pnpm --filter api build

FROM build AS deploy
RUN pnpm --filter api deploy --prod --legacy /prod
RUN cd /prod && ./node_modules/.bin/prisma generate

FROM node:22-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=deploy /prod /app/timesheet-be
WORKDIR /app/timesheet-be
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/src/server.js"]
