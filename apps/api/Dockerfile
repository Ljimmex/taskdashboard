FROM oven/bun:1.1.38 AS builder

WORKDIR /app

# Copy root package files
COPY package.json bun.lock ./

# Copy workspace packages
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies (without frozen lockfile for compatibility)
RUN bun install

# Build the API - fail the build if this step fails
WORKDIR /app/apps/api
ENV NODE_ENV=production
RUN bun run build

# Production stage
FROM oven/bun:1.1.38 AS production

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the server using the production build
CMD ["bun", "run", "start"]
