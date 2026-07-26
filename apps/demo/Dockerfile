# Base images are pinned by digest, not just by tag: a tag is mutable, so
# `1.3.11-alpine` can be repointed at a different image than the one this
# Dockerfile was reviewed against. Dependabot's docker ecosystem bumps the
# digests (see .github/dependabot.yml), so pinning does not freeze them.
FROM oven/bun:1.3.14-alpine@sha256:5acc90a93e91ff07bf72aa90a7c9f0fa189765aec90b47bdbf2152d2196383c0 AS builder
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
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS runner
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
