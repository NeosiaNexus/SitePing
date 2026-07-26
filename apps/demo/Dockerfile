# Base images are pinned by digest, not just by tag: a tag is mutable, so
# `1.3.11-alpine` can be repointed at a different image than the one this
# Dockerfile was reviewed against. Dependabot's docker ecosystem bumps the
# digests (see .github/dependabot.yml), so pinning does not freeze them.
FROM oven/bun:1.3.11-alpine@sha256:7ed9f74c326d1c260abe247ac423ccbf5ac92af62bb442d515d1f92f21e8ea9b AS builder
RUN apk add --no-cache nodejs
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

# Build workspace packages then demo
RUN bun run --filter='@siteping/core' build && \
    bun run --filter='@siteping/widget' build && \
    bun run --filter='@siteping/dashboard' build && \
    bun run --filter='@siteping/adapter-memory' build && \
    bun run --filter='@siteping/adapter-localstorage' build && \
    bun run --filter='@siteping/adapter-prisma' build
RUN cd apps/demo && bun run build

# --- Runner ---
FROM node:26-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/demo/.next/standalone ./
COPY --from=builder /app/apps/demo/.next/static ./apps/demo/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "apps/demo/server.js"]
