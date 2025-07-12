# Production Dockerfile for Cown Telegram App
FROM node:16-alpine

# Install system dependencies
RUN apk add --no-cache sqlite python3 make g++ dumb-init

# Add metadata
LABEL maintainer="Cown Telegram App"
LABEL description="🐄 Production Telegram messaging app with cow theme"
LABEL version="2.0.0"

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S cown -u 1001

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with more basic approach
RUN npm install --production && \
    npm cache clean --force

# Copy application code
COPY --chown=cown:nodejs . .

# Create necessary directories and set permissions
RUN mkdir -p /app/data /app/logs && \
    chown -R cown:nodejs /app

# Switch to non-root user
USER cown

# Set environment variables
ENV NODE_ENV=production
ENV DOCKER=true
ENV PORT=10000

# Expose port (Render uses PORT env var)
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start command with proper signal handling
CMD ["dumb-init", "node", "src/index.js"]
