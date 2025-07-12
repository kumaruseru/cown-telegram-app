/**
 * Quick Bot Token Setup for Testing
 * Sets up just the bot token to fix the "Unauthorized" error
 */

const fs = require('fs');
const path = require('path');

// Your bot token
const BOT_TOKEN = '7316714381:AAFBQb4IKDqf_8D76TG0sW7J87-eLssZh5Rc';

// Create .env file with bot token
const envContent = `# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=${BOT_TOKEN}

# App Configuration  
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_PATH=./data/cown.db

# Webhook URL (will be set when deployed)
TELEGRAM_WEBHOOK_URL=

# API credentials (optional for basic bot functionality)
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
`;

try {
    fs.writeFileSync('.env', envContent);
    console.log('✅ Bot token configured successfully!');
    console.log('📁 Created .env file with your bot token');
    console.log('🚀 You can now run the server with: node server.js');
    console.log('');
    console.log('🔗 Bot Token: ' + BOT_TOKEN);
    console.log('');
    console.log('⚠️  Remember to set up API ID and API HASH later for advanced features');
} catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
}
