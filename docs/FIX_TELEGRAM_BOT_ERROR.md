# Setup Telegram Bot - Fix Unauthorized Error

## Vấn đề hiện tại
Lỗi `Bot API error: Unauthorized` xảy ra khi TelegramBotService khởi tạo, có nghĩa là:
1. TELEGRAM_BOT_TOKEN không được cấu hình
2. Bot token không hợp lệ hoặc sai format
3. Bot đã bị vô hiệu hóa

## Cách fix

### Bước 1: Tạo Telegram Bot
1. Mở Telegram và tìm @BotFather
2. Gửi lệnh `/newbot`
3. Đặt tên cho bot (ví dụ: Cown Login Bot)
4. Đặt username cho bot (phải kết thúc bằng `bot`, ví dụ: `cown_login_bot`)
5. Copy token được cung cấp (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Bước 2: Cấu hình Environment Variables
1. Copy `.env.example` thành `.env`:
   ```bash
   cp .env.example .env
   ```

2. Sửa file `.env` và thêm bot token:
   ```bash
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   TELEGRAM_BOT_USERNAME=cown_login_bot
   ```

### Bước 3: Deploy lại
```bash
git add .
git commit -m "Fix: Add Telegram bot configuration"
git push origin main
```

## Nếu không muốn dùng Bot
Bot service sẽ tự động disable nếu không có token, app vẫn hoạt động bình thường.

## Đã fix
- ✅ Thêm validation token format
- ✅ Disable bot service khi token invalid thay vì crash app
- ✅ Cập nhật .env.example với bot config
- ✅ Improved error handling
