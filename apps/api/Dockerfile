FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json bun.lock ./

# Copy workspace packages
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN bun install --frozen-lockfile

# Build the API
WORKDIR /app/apps/api
RUN bun run build || true

# Production stage
FROM oven/bun:1.1-alpine AS production

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

WORKDIR /app/apps/api

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "run", "src/index.ts"]
