# 📱 Thiết lập SMS/Voice OTP thực tế với Twilio

## 🚀 Cách thiết lập Twilio để gửi OTP thật

### Bước 1: Đăng ký tài khoản Twilio
1. Truy cập https://www.twilio.com/
2. Đăng ký tài khoản miễn phí
3. Xác minh số điện thoại của bạn

### Bước 2: Lấy credentials
1. Vào Twilio Console Dashboard
2. Copy **Account SID** và **Auth Token**
3. Mua một số điện thoại Twilio (hoặc dùng số trial)

### Bước 3: Cấu hình environment variables
```bash
# Thêm vào file .env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### Bước 4: Test thử
```bash
# Deploy lên Render và test
npm start
```

## 💰 Chi phí Twilio

- **Trial Account**: Miễn phí với credit $15
- **SMS**: ~$0.0075/tin nhắn (VN)
- **Voice Call**: ~$0.085/phút (VN)
- **Số điện thoại**: ~$1/tháng

## 🔧 Cách hoạt động

1. **Telegram** (ưu tiên): Gửi OTP qua Telegram nếu user đã kết nối
2. **SMS**: Fallback đầu tiên - gửi tin nhắn SMS
3. **Voice Call**: Fallback cuối - gọi điện đọc OTP
4. **Console Log**: Development mode - hiển thị OTP trong log

## 🌍 Hỗ trợ quốc tế

Twilio hỗ trợ gửi SMS/Voice tới hầu hết các quốc gia:
- 🇻🇳 Vietnam: ✅
- 🇺🇸 United States: ✅
- 🇬🇧 United Kingdom: ✅
- 🇨🇳 China: ✅
- Và nhiều quốc gia khác...

## 🚨 Lưu ý bảo mật

- Không commit credentials vào Git
- Sử dụng environment variables
- Thiết lập webhook URLs an toàn
- Kiểm soát rate limiting

## 📞 Test OTP thực tế

Sau khi cấu hình, OTP sẽ được gửi **THẬT** qua:
- 📱 SMS đến số điện thoại
- 📞 Cuộc gọi thoại đọc mã OTP
- 💬 Telegram (nếu có kết nối)
