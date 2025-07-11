# 🚀 Hướng dẫn Setup nhanh - Cown Telegram App

## Bước 1: ~~Tạo Telegram Bot~~ (Không cần)

**Ứng dụng đã chuyển sang sử dụng Telegram Client API**, không cần tạo bot nữa!

## Bước 2: Cấu hình ứng dụng

**Cấu hình Telegram API (Đã tích hợp sẵn):**
- API ID: `20657396`
- API Hash: `2efea0a1f070994045dfa4e82d604996`
- App Title: `cown_telegram`
- Short Name: `cownapp`

✅ **Thông tin này đã được cấu hình sẵn trong ứng dụng!**

## Bước 3: Khởi động ứng dụng

### Cách 1: Sử dụng script tự động
```batch
start.bat
```

### Cách 2: Thủ công
```bash
npm install
npm start
```

## Bước 4: Đăng nhập Telegram

**Lần đầu chạy:**
1. Ứng dụng sẽ yêu cầu số điện thoại
2. Nhập mã xác nhận từ Telegram
3. Nhập mật khẩu 2FA (nếu có)
4. Session sẽ được lưu tự động

**Lần sau chạy:**
- Ứng dụng sẽ tự động đăng nhập bằng session đã lưu

## Bước 5: Sử dụng

1. Mở trình duyệt và truy cập: http://localhost:3000
2. Danh sách chat từ tài khoản Telegram sẽ hiển thị tự động
3. Chọn chat để xem và gửi tin nhắn

## ✅ Kiểm tra hoạt động

- Client hiển thị "Đã kết nối" ở góc trên cùng
- Danh sách chat tự động hiển thị từ tài khoản Telegram
- Gửi tin nhắn từ web app → Hiển thị trong Telegram
- Nhận tin nhắn từ Telegram → Hiển thị trong web app

## 🔧 Troubleshooting

**Client không kết nối:**
- Kiểm tra API ID và API Hash trong file `.env`
- Đảm bảo nhập đúng số điện thoại và mã xác nhận

**Không hiển thị chat:**
- Kiểm tra đăng nhập thành công
- Restart ứng dụng

**Lỗi session:**
- Xóa TELEGRAM_SESSION_STRING trong file `.env`
- Restart và đăng nhập lại

## 📱 ~~Lấy Chat ID~~ (Không cần)

**Với Client API, bạn không cần lấy Chat ID thủ công!**
Tất cả cuộc trò chuyện sẽ hiển thị tự động từ tài khoản Telegram của bạn.

---

🎉 **Chúc mừng! Bạn đã setup thành công Cown Telegram App!**
