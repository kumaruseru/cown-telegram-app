# Cách chạy Cown Telegram App với tên miền tùy chỉnh

## 1. Chạy trên mạng nội bộ (LAN)

Ứng dụng đã được cấu hình để lắng nghe trên tất cả network interfaces. Sau khi chạy `npm run dev`, bạn có thể truy cập:

- **Local**: http://localhost:3001
- **Mạng nội bộ**: 
  - http://192.168.0.65:3001
  - http://172.21.176.1:3001  
  - http://172.27.208.1:3001

## 2. Sử dụng tên miền tùy chỉnh (Local)

### Cách 1: Chỉnh sửa hosts file
Mở Command Prompt as Administrator và chạy:
```cmd
echo 192.168.0.65 cown.local >> C:\Windows\System32\drivers\etc\hosts
```

Sau đó bạn có thể truy cập: http://cown.local:3001

### Cách 2: Sử dụng PowerShell script
```powershell
# Chạy script này với quyền Administrator
Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "192.168.0.65 cown.local"
Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "192.168.0.65 cown-telegram.local"
```

## 3. Sử dụng ngrok (Tunnel công khai)

### Cài đặt ngrok:
1. Tải ngrok từ: https://ngrok.com/download
2. Giải nén và thêm vào PATH
3. Đăng ký tài khoản miễn phí tại https://ngrok.com

### Chạy ngrok:
```bash
# Terminal 1: Chạy ứng dụng
npm run dev

# Terminal 2: Chạy ngrok
ngrok http 3001
```

Ngrok sẽ cung cấp URL công khai như: https://abc123.ngrok.io

## 4. Scripts tiện lợi

### start-local.bat
```batch
@echo off
echo Starting Cown Telegram App on local network...
set HOST=0.0.0.0
set PORT=3001
npm run dev
```

### start-domain.bat
```batch
@echo off
echo Starting Cown Telegram App with custom domain...
echo Available at:
echo - http://localhost:3001
echo - http://192.168.0.65:3001
echo - http://cown.local:3001 (if hosts configured)
echo.
set HOST=0.0.0.0
set PORT=3001
npm run dev
```

## 5. Cấu hình tường lửa Windows

Nếu không thể truy cập từ mạng nội bộ, hãy mở Windows Defender Firewall:

```powershell
# Mở PowerShell as Administrator
New-NetFirewallRule -DisplayName "Cown Telegram App" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

## 6. Docker với custom domain

Nếu chạy bằng Docker:
```bash
docker run -p 3001:3000 -e HOST=0.0.0.0 cown-telegram-app
```

## Troubleshooting

### Không thể truy cập từ mạng nội bộ:
1. Kiểm tra tường lửa Windows
2. Đảm bảo HOST=0.0.0.0 trong .env
3. Kiểm tra router có chặn kết nối nội bộ không

### Tên miền tùy chỉnh không hoạt động:
1. Kiểm tra hosts file đã được cập nhật
2. Xóa cache DNS: `ipconfig /flushdns`
3. Restart browser hoặc sử dụng incognito mode
