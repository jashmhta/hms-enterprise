# Use Node.js 18 LTS as base image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
COPY tsconfig.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Development dependencies
FROM base AS dev-deps
COPY package*.json ./
RUN npm ci

# Build stage
FROM base AS build
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM base AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S billing -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Create uploads directory
RUN mkdir -p /app/uploads/billing && \
    chown -R billing:nodejs /app/uploads

# Switch to non-root user
USER billing

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js || exit 1

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]