@echo off
REM 🐄 Cown Telegram App - Deploy Script for Windows

echo 🚀 Starting Cown deployment...

REM Build Docker image
echo 📦 Building Docker image...
docker build -t cown-telegram-app:latest .

REM Tag for Docker Hub (thay your-username)
echo 🏷️ Tagging image...
docker tag cown-telegram-app:latest your-dockerhub-username/cown-telegram-app:latest
docker tag cown-telegram-app:latest your-dockerhub-username/cown-telegram-app:v1.0.0

REM Push to Docker Hub
echo ⬆️ Pushing to Docker Hub...
docker push your-dockerhub-username/cown-telegram-app:latest
docker push your-dockerhub-username/cown-telegram-app:v1.0.0

echo ✅ Deploy completed!
echo 🔗 Image available at:
echo    - Docker Hub: https://hub.docker.com/r/your-dockerhub-username/cown-telegram-app
pause
