# Hướng dẫn Hệ thống Đa User

## Tổng quan

Ứng dụng Cown Telegram App hiện đã hỗ trợ hệ thống đa user, cho phép nhiều người dùng cùng lúc sử dụng ứng dụng với tài khoản Telegram riêng biệt của họ.

## Các tính năng chính

### 1. Đăng ký và Đăng nhập
- Mỗi user có tài khoản riêng với username/password
- Hệ thống session với JWT tokens
- Bảo mật với bcrypt password hashing

### 2. Kết nối Telegram cá nhân
- Mỗi user liên kết với một tài khoản Telegram riêng
- Session string được lưu an toàn trong database
- Hỗ trợ API credentials riêng cho từng user

### 3. Tin nhắn và Chat riêng biệt
- Tin nhắn của mỗi user được phân tách hoàn toàn
- Chat list chỉ hiển thị các cuộc hội thoại của user hiện tại
- Real-time updates qua WebSocket với authentication

## Cách sử dụng

### Bước 1: Đăng ký tài khoản
1. Truy cập `/register`
2. Nhập thông tin: username, email, password, số điện thoại Telegram
3. Hệ thống sẽ tự động đăng nhập sau khi đăng ký thành công

### Bước 2: Kết nối Telegram
Có 2 cách kết nối:

#### Cách 1: Kết nối từ session đã lưu
- Nếu đã từng đăng nhập Telegram trước đó, hệ thống sẽ tự động kết nối

#### Cách 2: Thiết lập mới
1. Click "Thiết lập mới" khi được yêu cầu
2. Nhập số điện thoại Telegram
3. (Tùy chọn) Nhập API ID và API Hash riêng
4. Hệ thống sẽ yêu cầu xác thực qua Telegram

### Bước 3: Sử dụng ứng dụng
- Chat list sẽ hiển thị các cuộc hội thoại của bạn
- Gửi và nhận tin nhắn real-time
- Mọi dữ liệu được phân tách theo user

## API Endpoints mới

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Thông tin user hiện tại

### Telegram Client
- `GET /api/client/status` - Trạng thái kết nối Telegram
- `POST /api/client/connect` - Kết nối từ session đã lưu
- `POST /api/client/setup` - Thiết lập kết nối mới
- `GET /api/client/dialogs` - Danh sách chat của user
- `GET /api/client/history/:chatId` - Lịch sử tin nhắn
- `POST /api/client/send-message` - Gửi tin nhắn

### Data APIs (có authentication)
- `GET /api/messages` - Tin nhắn của user hiện tại
- `GET /api/chats` - Chat list của user hiện tại
- `POST /api/send-message` - Gửi tin nhắn

## Cấu trúc Database

### Bảng users
```sql
- id: User ID
- username: Tên đăng nhập
- email: Email
- password_hash: Mật khẩu đã hash
- telegram_phone: Số điện thoại Telegram
- telegram_session: Session string của Telegram
- telegram_api_id: API ID riêng (tùy chọn)
- telegram_api_hash: API Hash riêng (tùy chọn)
```

### Bảng messages
```sql
- user_account_id: ID của user sở hữu tin nhắn
- [các trường khác giữ nguyên]
```

### Bảng chats
```sql
- user_account_id: ID của user sở hữu chat
- [các trường khác giữ nguyên]
```

### Bảng user_sessions
```sql
- user_id: ID của user
- session_token: JWT token
- expires_at: Thời gian hết hạn
```

## Socket.IO Events

### Client → Server
- `authenticate`: Xác thực socket với session token
- `join-chat`: Tham gia chat (cần authentication)
- `send-message`: Gửi tin nhắn (cần authentication)

### Server → Client
- `authenticated`: Xác thực thành công
- `authentication-failed`: Xác thực thất bại
- `new-message`: Tin nhắn mới (chỉ gửi đến user liên quan)
- `message-sent`: Tin nhắn đã gửi thành công
- `message-error`: Lỗi gửi tin nhắn
- `chat-updated`: Cập nhật thông tin chat

## Bảo mật

1. **Session Management**: JWT tokens với thời gian hết hạn
2. **Password Security**: Bcrypt với salt rounds
3. **Data Isolation**: Mọi dữ liệu đều được filter theo user_account_id
4. **Socket Authentication**: WebSocket connections cần xác thực
5. **API Protection**: Tất cả API quan trọng đều có middleware authentication

## Cấu hình Environment

```env
# Database
DB_PATH=./database/messages.db

# Authentication
JWT_SECRET=your_jwt_secret_here

# Telegram API (mặc định cho tất cả users)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash

# Server
PORT=3000
NODE_ENV=development
```

## Lưu ý quan trọng

1. **Telegram Session**: Session string được lưu trong database, không cần file .env
2. **API Credentials**: Users có thể dùng API credentials riêng hoặc dùng mặc định
3. **Data Privacy**: Mỗi user chỉ thấy được dữ liệu của mình
4. **Session Security**: Sessions có thời gian hết hạn và được quản lý an toàn

## Troubleshooting

### Không kết nối được Telegram
1. Kiểm tra API ID và API Hash
2. Thử thiết lập kết nối mới
3. Đảm bảo số điện thoại Telegram đúng định dạng

### Lỗi authentication
1. Kiểm tra session token
2. Đăng nhập lại nếu cần
3. Clear cookies và thử lại

### Không nhận được tin nhắn real-time
1. Kiểm tra kết nối WebSocket
2. Đảm bảo đã authenticate socket
3. Kiểm tra Telegram client connection status
