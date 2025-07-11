# Cown Telegram App - Multi-User Edition

Ứng dụng nhắn tin hiện đại dựa trên **Telegram Client API (MTProto)** với hỗ trợ đa người dùng. Mỗi user có thể liên kết với tài khoản Telegram riêng biệt và quản lý tin nhắn độc lập.

## ✨ Tính năng chính

### � Hệ thống Authentication
- **Đăng ký/Đăng nhập** với username và password
- **Session management** với JWT tokens bảo mật
- **Password hashing** với bcrypt
- **Auto-logout** khi session hết hạn

### 📱 Multi-User Telegram Integration
- **Đa người dùng**: Mỗi user có tài khoản Telegram riêng
- **Session isolation**: Dữ liệu hoàn toàn phân tách theo user
- **Flexible API credentials**: Dùng API riêng hoặc shared
- **Auto-reconnect**: Kết nối tự động từ session đã lưu

### 💬 Messaging Features
- **Real-time messaging** qua WebSocket với authentication
- **Chat management**: Danh sách chat riêng cho từng user
- **Message history**: Lưu trữ và đồng bộ tin nhắn
- **Media support**: Hỗ trợ ảnh, file, sticker (beta)

### 🎨 Modern UI/UX
- **Responsive design** thích ứng mọi thiết bị
- **Dark/Light theme** (coming soon)
- **Real-time notifications** trong ứng dụng
- **Intuitive interface** dễ sử dụng

## 🚀 Cài đặt

### 1. Clone dự án
```bash
git clone <repository-url>
cd cown
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình môi trường
Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:
```env
# Telegram API Client Configuration
TELEGRAM_API_ID=20657396
TELEGRAM_API_HASH=2efea0a1f070994045dfa4e82d604996

# Session String (sẽ được tạo tự động lần đầu chạy)
TELEGRAM_SESSION_STRING=

# Server Configuration
PORT=3000
DB_PATH=./database/messages.db

# App Information
APP_TITLE=cown_telegram
APP_SHORT_NAME=cownapp
```

### 4. Cấu hình Telegram API

Ứng dụng Cown đã được cấu hình với:
- **API ID**: `20657396`
- **API Hash**: `2efea0a1f070994045dfa4e82d604996`
- **App Title**: `cown_telegram`
- **Short Name**: `cownapp`

Thông tin này được lấy từ [my.telegram.org](https://my.telegram.org) và đã được tích hợp sẵn.

### 5. Đăng nhập Telegram

Khi chạy ứng dụng lần đầu, bạn sẽ cần đăng nhập bằng tài khoản Telegram:
1. Nhập số điện thoại
2. Nhập mã xác nhận từ Telegram
3. Nhập mật khẩu 2FA (nếu có)

### 6. Tạo Telegram Bot

**Bước này không còn cần thiết** - Ứng dụng sử dụng Telegram Client API thay vì Bot API.

### 7. Khởi động ứng dụng

#### Development mode:
```bash
npm run dev
```

#### Production mode:
```bash
npm start
```

Ứng dụng sẽ chạy tại: http://localhost:3000

## 📖 Hướng dẫn sử dụng

### Bước 1: Đăng nhập Telegram
1. Khởi động ứng dụng Cown
2. Nhập số điện thoại khi được yêu cầu
3. Nhập mã xác nhận từ Telegram
4. Nhập mật khẩu 2FA (nếu có)
5. Session sẽ được lưu tự động cho lần sau

### Bước 2: Sử dụng ứng dụng
1. Danh sách chat sẽ tự động hiển thị từ tài khoản Telegram của bạn
2. Chọn cuộc trò chuyện để xem và gửi tin nhắn
3. Tất cả tin nhắn sẽ được đồng bộ real-time

### Lấy Chat ID
Với Client API, bạn không cần phải lấy Chat ID thủ công. Tất cả cuộc trò chuyện sẽ hiển thị tự động.

## 🛠️ Cấu trúc dự án

```
cown/
├── src/
│   ├── database/
│   │   └── DatabaseManager.js     # Quản lý SQLite database
│   ├── handlers/
│   │   └── MessageHandler.js      # Xử lý tin nhắn
│   └── services/
│       └── TelegramService.js     # Tích hợp Telegram API
├── public/
│   ├── index.html                 # Giao diện chính
│   ├── styles.css                 # CSS styling
│   └── app.js                     # Frontend JavaScript
├── database/                      # SQLite database files
├── server.js                      # Server chính
├── package.json
└── README.md
```

## 🔧 API Endpoints

### GET /api/health
Kiểm tra trạng thái ứng dụng

### GET /api/chats
Lấy danh sách tất cả cuộc trò chuyện

### GET /api/messages?chatId={chatId}
Lấy tin nhắn của một cuộc trò chuyện

### POST /api/send-message
Gửi tin nhắn mới
```json
{
  "chatId": "123456789",
  "message": "Nội dung tin nhắn"
}
```

## 🔌 WebSocket Events

### Client → Server
- `join-chat`: Tham gia room chat
- `send-message`: Gửi tin nhắn

### Server → Client
- `new-message`: Tin nhắn mới
- `message-sent`: Xác nhận tin nhắn đã gửi
- `message-error`: Lỗi gửi tin nhắn
- `chat-updated`: Cập nhật thông tin chat

## 🎨 Tùy chỉnh

### Thay đổi giao diện
Chỉnh sửa file `public/styles.css` để tùy chỉnh:
- Màu sắc chủ đề
- Font chữ
- Layout responsive

### Thêm tính năng
1. Chỉnh sửa `TelegramService.js` để thêm tương tác Telegram API
2. Cập nhật `MessageHandler.js` cho logic xử lý tin nhắn
3. Mở rộng frontend trong `public/app.js`

## 🐛 Troubleshooting

### Bot không nhận tin nhắn
- Kiểm tra TELEGRAM_BOT_TOKEN trong file `.env`
- Đảm bảo bot đã được thêm vào chat/group
- Kiểm tra logs server để xem lỗi

### Không kết nối được database
- Kiểm tra quyền write trong thư mục `database/`
- Xóa file database cũ và restart ứng dụng

### WebSocket không hoạt động
- Kiểm tra port 3000 có bị chặn không
- Kiểm tra console browser để xem lỗi JavaScript

## 📝 License

MIT License - xem file LICENSE để biết chi tiết.

## 🤝 Đóng góp

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 🎯 Roadmap

- [ ] Hỗ trợ gửi file/hình ảnh
- [ ] Thêm emoji picker
- [ ] Dark/Light theme toggle
- [ ] Backup/restore database
- [ ] Multi-bot support
- [ ] Message scheduling
- [ ] Group management features

## 📞 Hỗ trợ

Nếu bạn gặp vấn đề hoặc có câu hỏi, vui lòng tạo issue trên GitHub hoặc liên hệ qua email.

---

Được tạo với ❤️ bởi Nghia
