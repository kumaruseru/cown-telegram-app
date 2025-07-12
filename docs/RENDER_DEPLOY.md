# Deploying Cown Telegram App to Render

## Prerequisites

- ✅ GitHub repository with your code
- ✅ Render account (free tier available)
- ✅ Telegram API credentials

## Deployment Steps

### 1. Access Render Dashboard

Visit [render.com](https://render.com) and sign in to your account.

### 2. Create New Web Service

1. Click **"New +"** button
2. Select **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select repository: `kumaruseru/cown-telegram-app`
5. Click **"Connect"**

### 3. Configure Service Settings

Render should auto-detect your `render.yaml` configuration:

- **Name**: `cown-telegram-app`
- **Environment**: `Docker`
- **Region**: `Singapore` (or your preferred region)
- **Branch**: `main`
- **Build Command**: (Docker will handle this)
- **Start Command**: (Docker will handle this)
- **Plan**: `Free`

### 4. Set Environment Variables

Add these environment variables in the Render dashboard:

```
TELEGRAM_API_ID=20657396
TELEGRAM_API_HASH=2efea0a1f070994045dfa4e82d604996
NODE_ENV=production
DOCKER=true
PORT=3000
DB_PATH=/app/data/cown.db
```

### 5. Deploy

Click **"Create Web Service"** to start deployment.

## Expected Deployment Process

1. **Build Phase**: Render will build your Docker image
2. **Deploy Phase**: Container will start and health check will verify it's running
3. **Live**: Your app will be accessible at `https://your-app-name.onrender.com`

## Health Check

The app includes a health check endpoint at `/health` that Render will use to verify the service is running properly.

## Database

The app uses SQLite with data stored in `/app/data/cown.db` inside the container. Note that on Render's free tier, the filesystem is ephemeral, so data will be lost when the service restarts.

## Troubleshooting

### Build Issues

- Check the build logs in Render dashboard
- Verify Dockerfile syntax
- Ensure all dependencies are properly specified

### Runtime Issues

- Check service logs in Render dashboard
- Verify environment variables are set correctly
- Check that the health check endpoint is responding

### Database Issues

- Verify DB_PATH is correctly set
- Check that the database directory is writable
- Review SQLite initialization logs

## Production Considerations

For production use, consider:

1. **Persistent Storage**: Use Render's disk storage or external database
2. **Environment Variables**: Use Render's environment variable management
3. **Monitoring**: Set up logging and monitoring
4. **Backup**: Implement database backup strategy

## Useful Commands

View logs:

```bash
# In Render dashboard, go to your service > Logs
```

Force redeploy:

```bash
# In Render dashboard, go to your service > Manual Deploy
```

## Support

- Render Documentation: https://render.com/docs
- GitHub Repository: https://github.com/kumaruseru/cown-telegram-app
