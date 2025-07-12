# 🚀 Cown Telegram App - Render Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Required Files Created:
- `render.yaml` - Render service configuration
- `Dockerfile` - Container configuration  
- `start.sh` - Production startup script
- `.dockerignore` - Docker build optimization

### 🔑 Environment Variables Required:
```bash
# Telegram API (get from https://my.telegram.org)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash

# Telegram Bot (keep existing)
TELEGRAM_BOT_TOKEN=7316714381:AAFBQb4KDqf_8D76IG0sW7J87-eLssZh5Rc
TELEGRAM_BOT_USERNAME=Cown_Login_bot

# Production Settings
NODE_ENV=production
PORT=10000
HOST=0.0.0.0

# Security Keys (generate new for production)
JWT_SECRET=your_strong_jwt_secret_here
SESSION_SECRET=your_strong_session_secret_here

# Database
DB_TYPE=sqlite
DB_PATH=./data/cown.db

# Twilio (optional - for SMS OTP)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone
```

## 🚀 Deployment Steps

### 1. Connect to GitHub
- Go to [Render Dashboard](https://render.com)
- Connect your GitHub account
- Select this repository: `kumaruseru/cown-telegram-app`

### 2. Create Web Service
- Choose "Web Service"
- Runtime: Docker
- Build Command: `docker build -t cown-app .`
- Start Command: `./start.sh`

### 3. Configure Environment
Add all environment variables listed above in Render dashboard

### 4. Deploy Settings
- **Name**: `cown-telegram-app`
- **Region**: Choose closest to your users
- **Instance Type**: Starter (free) or higher
- **Auto-Deploy**: Yes (from main branch)

## 🌐 Post-Deployment

### Update Telegram Bot Webhook:
Replace `YOUR_RENDER_URL` with your actual Render URL:
```bash
curl -X POST "https://api.telegram.org/bot7316714381:AAFBQb4KDqf_8D76IG0sW7J87-eLssZh5Rc/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://YOUR_RENDER_URL.onrender.com/webhook/telegram"}'
```

### Test Your Deployment:
- Health Check: `https://YOUR_RENDER_URL.onrender.com/health`
- Login Page: `https://YOUR_RENDER_URL.onrender.com/login-phone.html`
- Bot Info: `https://YOUR_RENDER_URL.onrender.com/api/bot/info`

## 📊 Monitoring
- **Logs**: Available in Render dashboard
- **Metrics**: CPU, Memory, Response times
- **Health**: Automatic health checks every 30s

## ⚠️ Important Notes
1. Get your own Telegram API credentials from https://my.telegram.org
2. Generate strong JWT and Session secrets for production
3. Configure Twilio for real SMS OTP (optional)
4. Enable persistent disk for SQLite database
5. Update webhook URL after deployment

## 🎉 Your App Will Be Live At:
`https://your-app-name.onrender.com`

Ready to deploy! 🚀
