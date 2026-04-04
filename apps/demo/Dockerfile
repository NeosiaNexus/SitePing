FROM oven/bun:1.3.11-alpine AS builder
RUN apk add --no-cache nodejs
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

# Build workspace packages then demo
RUN bun run --filter='@siteping/core' build && \
    bun run --filter='@siteping/widget' build && \
    bun run --filter='@siteping/adapter-prisma' build
RUN cd apps/demo && bun run build

# --- Runner ---
FROM node:20-alpine AS runner
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
