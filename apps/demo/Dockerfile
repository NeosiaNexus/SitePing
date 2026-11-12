# Production image of siteping.dev (apps/demo): the Next.js standalone server
# on Node, running as an unprivileged user on a read-only root filesystem.
# The build context is the repository root:
#
#   docker build -f apps/demo/Dockerfile -t siteping-demo .
#   (add --build-arg NEXT_PUBLIC_RYBBIT_SITE_ID=<id> to measure the audience)
#   docker run --rm --read-only --tmpfs /tmp -p 3000:3000 siteping-demo
#
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
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run --filter='@siteping/core' build && \
    bun run --filter='@siteping/widget' build && \
    bun run --filter='@siteping/dashboard' build && \
    bun run --filter='@siteping/adapter-memory' build && \
    bun run --filter='@siteping/adapter-localstorage' build && \
    bun run --filter='@siteping/server' build

# Rybbit site id (audience measurement), inlined into the site at build time.
# Empty: the site loads no measurement script. Declared here, after the
# package builds, so changing it only invalidates the demo build.
ARG NEXT_PUBLIC_RYBBIT_SITE_ID=""
ENV NEXT_PUBLIC_RYBBIT_SITE_ID=$NEXT_PUBLIC_RYBBIT_SITE_ID
RUN cd apps/demo && bun run build

# --- Runner ---
FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS runner
WORKDIR /app
# HOSTNAME: without it the standalone server only listens on the container's
# own hostname, and nothing outside it (a proxy, a probe) can reach it.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder --chown=1001:1001 /app/apps/demo/.next/standalone ./
COPY --from=builder --chown=1001:1001 /app/apps/demo/.next/static ./apps/demo/.next/static

# The only path Next.js writes at runtime is its cache (optimized images).
# The standalone output of a monorepo nests the app under apps/demo, so the
# cache is linked to a fixed path a platform can mount as a writable volume
# while the rest of the filesystem stays read-only. Without such a volume the
# server still serves; it just cannot keep what it optimized.
RUN mkdir -p /app/.next/cache && \
    ln -s /app/.next/cache /app/apps/demo/.next/cache && \
    chown -h 1001:1001 /app/.next /app/.next/cache /app/apps/demo/.next/cache

# Numeric, so an orchestrator can verify the image does not run as root.
USER 1001:1001
EXPOSE 3000
CMD ["node", "apps/demo/server.js"]
