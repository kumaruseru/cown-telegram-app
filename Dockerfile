# Sử dụng Node.js 18 Alpine (nhẹ nhất)
FROM node:18-alpine

# Install SQLite và các dependencies system cần thiết
RUN apk add --no-cache sqlite python3 make g++

# Thêm metadata
LABEL maintainer="Cown Telegram App"
LABEL description="🐄 Modern Telegram messaging app with cow theme"
LABEL version="1.0.0"

# Tạo thư mục app
WORKDIR /app

# Sao chép package files trước để cache dependencies
COPY package*.json ./

# Install dependencies including sqlite3
RUN npm ci --only=production --silent --no-audit --no-fund && \
    npm cache clean --force

# Sao chép source code
COPY . .

# Tạo thư mục cho SQLite database
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV DOCKER=true
ENV PORT=3000

# Expose port
EXPOSE 3000

# Tạo user non-root cho security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S cown -u 1001

# Chuyển ownership cho user
RUN chown -R cown:nodejs /app
USER cown

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start command
CMD ["npm", "start"]
