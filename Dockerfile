### Multi-stage Dockerfile for Next.js (App Router, Node runtime)
# Switched to Debian base to avoid Alpine/musl OpenSSL issues with Prisma

# 1) deps: install dependencies
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
	if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; \
	elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
	elif [ -f yarn.lock ]; then corepack enable && yarn install --frozen-lockfile; \
	else npm install --no-audit --no-fund; fi

# 2) builder: build the app
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Ensure OpenSSL and certs available for Prisma and HTTPS
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure prod envs are available at build if needed
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Generate Prisma client for Debian/openssl-3
RUN npm run prisma:generate || true
RUN npm run build

# 3) runner: production image
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN groupadd -g 1001 nodejs && useradd -m -u 1001 -g nodejs nextjs

# Copy only required files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Ensure runtime cache dirs exist and are writable by non-root user
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app

# Use non-root
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]

