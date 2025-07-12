# Sử dụng Node.js 18 Alpine (nhẹ nhất)
FROM node:18-alpine

# Install SQLite và các dependencies system cần thiết
RUN apk add --no-cache sqlite python3 make g++ dumb-init

# Thêm metadata
LABEL maintainer="Cown Telegram App"
LABEL description="🐄 Optimized Telegram messaging app with cow theme"
LABEL version="2.0.0"

# Tạo thư mục app
WORKDIR /app

# Tạo user non-root cho security trước
RUN addgroup -g 1001 -S nodejs && \
    adduser -S cown -u 1001

# Sao chép package files trước để cache dependencies
COPY package*.json ./
COPY .npmrc ./

# Install dependencies với optimization
RUN npm ci --only=production --silent --no-audit --no-fund && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Sao chép source code
COPY --chown=cown:nodejs . .

# Tạo thư mục cần thiết
RUN mkdir -p /app/data /app/logs && \
    chown -R cown:nodejs /app

# Set environment variables
ENV NODE_ENV=production
ENV DOCKER=true
ENV PORT=3000

# Expose port
EXPOSE 3000

# Switch to non-root user
USER cown

# Health check với timeout tối ưu
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.js || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start command
CMD ["npm", "start"]
