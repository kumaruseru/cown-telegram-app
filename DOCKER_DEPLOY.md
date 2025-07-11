# 🐄 Cown Telegram App - Docker Deployment

## 📦 **Containerized với Docker - MIỄN PHÍ 100%**

### **Chi phí:**
- ✅ **Docker Hub**: Miễn phí unlimited public repos
- ✅ **GitHub Container Registry**: Miễn phí 500MB
- ✅ **Railway/Render**: Miễn phí hosting

---

## 🚀 **Cách 1: Deploy lên Docker Hub**

### Bước 1: Tạo tài khoản Docker Hub
1. Vào [hub.docker.com](https://hub.docker.com)
2. Sign up miễn phí
3. Tạo repository: `cown-telegram-app`

### Bước 2: Build và Push
```bash
# Build image
docker build -t cown-telegram-app .

# Tag cho Docker Hub (thay your-username)
docker tag cown-telegram-app your-dockerhub-username/cown-telegram-app:latest

# Login Docker Hub
docker login

# Push image
docker push your-dockerhub-username/cown-telegram-app:latest
```

### Bước 3: Deploy trên Railway/Render
```bash
# Pull và run từ Docker Hub
docker pull your-dockerhub-username/cown-telegram-app:latest
docker run -p 3000:3000 your-dockerhub-username/cown-telegram-app:latest
```

---

## 🐙 **Cách 2: GitHub Container Registry**

### Bước 1: Setup GitHub Token
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate token với quyền `write:packages`
3. Login: `echo $TOKEN | docker login ghcr.io -u USERNAME --password-stdin`

### Bước 2: Build và Push
```bash
# Build
docker build -t cown-telegram-app .

# Tag for GitHub
docker tag cown-telegram-app ghcr.io/your-github-username/cown-telegram-app:latest

# Push
docker push ghcr.io/your-github-username/cown-telegram-app:latest
```

---

## 🎯 **Cách 3: Deploy trên Railway (Miễn phí)**

### Railway với Docker:
1. Vào [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Chọn repository
4. Railway tự động detect Dockerfile
5. **Miễn phí**: $5 credit/tháng, đủ cho hobby project

### Environment Variables:
```
NODE_ENV=production
TELEGRAM_API_ID=20657396
TELEGRAM_API_HASH=bdc23b893d3e90b6f5f6f7eb9a38d1aa
SESSION_SECRET=cown-super-secret-key-2025
```

---

## 🔧 **Local Development**

### Chạy với Docker Compose:
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Chạy trực tiếp:
```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

---

## 📊 **Monitoring & Logs**

### Health Check:
- URL: `http://your-app-url/health`
- Docker tự động check health mỗi 30s

### View Logs:
```bash
# Docker Compose
docker-compose logs -f cown-app

# Docker Run
docker logs -f container-name
```

---

## 🔗 **Kết quả cuối cùng:**

Sau khi deploy thành công, bạn sẽ có:

1. **Docker Hub**: `https://hub.docker.com/r/your-username/cown-telegram-app`
2. **Live App**: `https://your-app-name.railway.app` hoặc `https://your-app.onrender.com`
3. **GitHub**: Repository với Dockerfile
4. **Domain**: Có thể custom domain miễn phí

### **Hoàn toàn miễn phí!** 🎉
