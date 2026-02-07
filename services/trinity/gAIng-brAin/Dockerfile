# gAIng-Brain Production Docker Image
# Multi-stage build for optimized production deployment

# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install build tools for native modules
RUN apk add --no-cache python3 make g++ libc6-compat

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# =============================================================================
# Stage 2: Frontend Build
# =============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# =============================================================================
# Stage 3: Production Runtime
# =============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Security: Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 gaing

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY --chown=gaing:nodejs . .

# Copy built frontend
COPY --from=frontend-builder --chown=gaing:nodejs /app/frontend/../public/vision-pwa ./public/vision-pwa

# Remove development files
RUN rm -rf frontend/.next frontend/node_modules \
    Jarvis/.next Jarvis/node_modules \
    .git .github .cache .tmp*

# Create required directories
RUN mkdir -p logs uploads data && \
    chown -R gaing:nodejs logs uploads data

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Switch to non-root user
USER gaing

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start command
CMD ["node", "index.js"]
