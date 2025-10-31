# Multi-stage Dockerfile for HMS User Service
# Production-ready with security best practices

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set environment variables
ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=error
ENV NPM_CONFIG_PROGRESS=false

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY ../../shared ./shared

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Stage 2: Runtime stage
FROM node:18-alpine AS runtime

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV USER=hmsuser

# Create non-root user
RUN addgroup -g 1001 -S ${USER} && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G ${USER} ${USER}

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=${USER}:${USER} /app/dist ./dist
COPY --from=builder --chown=${USER}:${USER} /app/node_modules ./node_modules
COPY --from=builder --chown=${USER}:${USER} /app/package*.json ./

# Create required directories
RUN mkdir -p /app/logs /app/uploads && \
    chown -R ${USER}:${USER} /app/logs /app/uploads

# Switch to non-root user
USER ${USER}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE ${PORT}

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]