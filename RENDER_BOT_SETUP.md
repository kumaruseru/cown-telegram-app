# Configure Telegram Bot Token on Render

## Local Environment
Bot token đã được cấu hình trong .env:
```
TELEGRAM_BOT_TOKEN=7316714381:AAFBQb4IKDqf_8D76TG0sW7J87-eLssZh5Rc
TELEGRAM_BOT_USERNAME=Cown_Login_bot
```

## Production (Render) Setup
Để fix lỗi "Unauthorized" trên Render, cần thêm environment variables:

### Bước 1: Truy cập Render Dashboard
1. Đăng nhập https://render.com
2. Chọn service `cown-telegram-app`
3. Vào tab "Environment"

### Bước 2: Thêm Environment Variables
```
TELEGRAM_BOT_TOKEN = 7316714381:AAFBQb4IKDqf_8D76TG0sW7J87-eLssZh5Rc
TELEGRAM_BOT_USERNAME = Cown_Login_bot
```

### Bước 3: Redeploy
1. Sau khi thêm env vars, click "Save Changes"
2. Service sẽ tự động redeploy
3. Kiểm tra logs để confirm bot đã connect thành công

## Expected Result
Sau khi cấu hình, logs sẽ hiển thị:
```
INFO: [TelegramBotService] Bot connected: @Cown_Login_bot
INFO: [TelegramBotService] TelegramBotService initialized successfully
```

Thay vì:
```
ERROR: [TelegramBotService] Bot API error: Unauthorized
```
