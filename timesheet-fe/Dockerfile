# syntax=docker/dockerfile:1
# Build context is the repo root (pnpm workspace).
FROM node:22-slim AS base
RUN npm install -g pnpm@10.30.1
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY timesheet-be/package.json timesheet-be/package.json
COPY timesheet-fe/package.json timesheet-fe/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY timesheet-fe timesheet-fe
ENV DOCKER_BUILD=1 API_ORIGIN=http://api:4000
RUN pnpm --filter web build

FROM base AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/timesheet-fe/.next/standalone ./
COPY --from=build /app/timesheet-fe/.next/static ./timesheet-fe/.next/static
WORKDIR /app/timesheet-fe
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD node -e "fetch('http://localhost:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
