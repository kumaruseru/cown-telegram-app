#!/bin/bash

# 🐄 Cown Telegram App - Deploy Script
echo "🚀 Starting Cown deployment..."

# Build Docker image
echo "📦 Building Docker image..."
docker build -t cown-telegram-app:latest .

# Tag for Docker Hub (thay your-username)
echo "🏷️ Tagging image..."
docker tag cown-telegram-app:latest your-dockerhub-username/cown-telegram-app:latest
docker tag cown-telegram-app:latest your-dockerhub-username/cown-telegram-app:v1.0.0

# Push to Docker Hub
echo "⬆️ Pushing to Docker Hub..."
docker push your-dockerhub-username/cown-telegram-app:latest
docker push your-dockerhub-username/cown-telegram-app:v1.0.0

# GitHub Container Registry alternative
echo "⬆️ Pushing to GitHub Container Registry..."
docker tag cown-telegram-app:latest ghcr.io/your-github-username/cown-telegram-app:latest
docker push ghcr.io/your-github-username/cown-telegram-app:latest

echo "✅ Deploy completed!"
echo "🔗 Image available at:"
echo "   - Docker Hub: https://hub.docker.com/r/your-dockerhub-username/cown-telegram-app"
echo "   - GitHub: https://github.com/your-github-username/cown-telegram-app/pkgs/container/cown-telegram-app"
