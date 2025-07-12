# Dockerfile đơn giản cho Cown Telegram App
FROM node:16-alpine

# Cài đặt dependencies hệ thống
RUN apk add --no-cache sqlite

# Tạo thư mục app
WORKDIR /app

# Copy package files
COPY package*.json ./

# Cài đặt dependencies
RUN npm install --production

# Copy source code
COPY . .

# Tạo thư mục data
RUN mkdir -p /app/data

# Set environment
ENV NODE_ENV=production
ENV PORT=10000

# Expose port
EXPOSE 10000

# Chạy main server
CMD ["node", "server.js"]
