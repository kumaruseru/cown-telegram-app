# 🔑 HOW TO GET YOUR TELEGRAM API CREDENTIALS

## Step 1: Visit Telegram API Development
Go to: https://my.telegram.org/auth

## Step 2: Login with Your Phone Number
- Enter your phone number (the one linked to your Telegram account)
- Enter the verification code sent to your Telegram app

## Step 3: Create Application
Click "API Development Tools" → "Create application"

Fill in these details:
- App title: Cown Telegram App
- Short name: cown-app  
- Platform: Desktop
- Description: Telegram authentication and messaging for Cown application

## Step 4: Get Your Credentials
After creation, you'll receive:
- API ID: (numeric, e.g., 12345678)
- API Hash: (32-character string, e.g., abcdef...)

## Step 5: Update Your Environment
Replace these values in your .env file:

```env
# YOUR NEW TELEGRAM API CREDENTIALS
TELEGRAM_API_ID=YOUR_API_ID_HERE
TELEGRAM_API_HASH=YOUR_API_HASH_HERE
```

## Step 6: Keep Your Bot Token
Your bot token should remain the same:
```env
TELEGRAM_BOT_TOKEN=7316714381:AAFBQb4KDqf_8D76IG0sW7J87-eLssZh5Rc
TELEGRAM_BOT_USERNAME=Cown_Login_bot
```

## ⚠️ Important Security Notes:
1. Never share your API credentials publicly
2. Keep your .env file in .gitignore
3. Use different credentials for development and production
4. API credentials are tied to your personal Telegram account

## 🔄 After Getting New Credentials:
1. Update .env file with your new API_ID and API_HASH
2. Restart your application: npm start
3. Test the Telegram authentication flow

Your app will now use YOUR official Telegram API credentials!
