# 🌍 Cách đưa Cown Telegram App lên công khai

## 🚀 Phương án 1: Ngrok (Nhanh nhất - 5 phút)

### Bước 1: Setup Ngrok

1. **Đăng ký tài khoản miễn phí**: https://ngrok.com/signup
2. **Lấy authtoken**: https://dashboard.ngrok.com/get-started/your-authtoken
3. **Cấu hình ngrok**:
    ```bash
    # Restart terminal trước, sau đó chạy:
    ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
    ```

### Bước 2: Chạy công khai

```bash
# Cách 1: Tự động (khuyến nghị)
.\go-public.bat

# Cách 2: Thủ công
# Terminal 1: Start app
npm run dev:network

# Terminal 2: Start tunnel (sau khi app đã chạy)
ngrok http 3001
```

### Kết quả:

- **URL công khai**: `https://abc123.ngrok.io` (ngrok sẽ cung cấp)
- **Miễn phí**: 2 tunnels đồng thời
- **Thời gian**: Tunnel sẽ chạy cho đến khi bạn tắt

---

## 🏗️ Phương án 2: Render Deploy (Vĩnh viễn miễn phí)

### Bước 1: Truy cập Render

1. Đi đến: https://render.com
2. Đăng nhập bằng GitHub account

### Bước 2: Tạo Web Service

1. Click **"New +"** → **"Web Service"**
2. Chọn repository: **`kumaruseru/cown-telegram-app`**
3. Click **"Connect"**

### Bước 3: Cấu hình

Render sẽ tự động phát hiện `render.yaml` với cấu hình:

- **Name**: `cown-telegram-app`
- **Environment**: `Docker`
- **Region**: `Singapore` (hoặc chọn gần bạn nhất)
- **Plan**: `Free`

### Bước 4: Environment Variables

Thêm các biến môi trường trong Render dashboard:

```
TELEGRAM_API_ID=20657396
TELEGRAM_API_HASH=2efea0a1f070994045dfa4e82d604996
NODE_ENV=production
DOCKER=true
PORT=3000
DB_PATH=/app/data/cown.db
```

### Bước 5: Deploy

Click **"Create Web Service"** và đợi deploy (5-10 phút)

### Kết quả:

- **URL**: `https://cown-telegram-app.onrender.com`
- **Miễn phí**: 750 giờ/tháng (đủ để chạy 24/7)
- **Tự động**: Deploy lại khi push code mới

---

## 📱 Phương án 3: Railway (Alternative)

### Quick Deploy:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template)

1. Click nút Deploy above
2. Connect GitHub repo
3. Thêm environment variables
4. Deploy!

---

## 🔧 So sánh các phương án:

| Phương án   | Thời gian setup | URL                      | Tính ổn định | Chi phí  |
| ----------- | --------------- | ------------------------ | ------------ | -------- |
| **Ngrok**   | 5 phút          | Thay đổi mỗi lần restart | Tạm thời     | Miễn phí |
| **Render**  | 10 phút         | Cố định                  | Cao          | Miễn phí |
| **Railway** | 8 phút          | Cố định                  | Cao          | Miễn phí |

## 🎯 Khuyến nghị:

### Để test nhanh:

```bash
.\go-public.bat
```

### Để production:

1. Deploy lên **Render** (đã có sẵn config)
2. URL sẽ là: `https://cown-telegram-app.onrender.com`

---

## 🛠️ Troubleshooting

### Ngrok không hoạt động:

```bash
# Restart terminal và thử:
ngrok version
# Nếu vẫn lỗi, download manual: https://ngrok.com/download
```

### Render deploy failed:

1. Kiểm tra logs trong Render dashboard
2. Đảm bảo environment variables đã được set
3. Check Dockerfile và render.yaml

### App không load:

1. Kiểm tra health check endpoint: `/health`
2. Xem logs để debug lỗi database hoặc Telegram API

---

## 🎉 Hoàn thành!

Sau khi setup, bạn có thể share URL công khai với bất kỳ ai để họ sử dụng ứng dụng Telegram của bạn!
