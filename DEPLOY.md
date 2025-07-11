# 🐄 Cown - Telegram Messaging App

Ứng dụng nhắn tin dựa trên Telegram API với giao diện đáng yêu và hiện đại.

## ✨ Tính năng

- 📱 Đăng nhập bằng số điện thoại (OTP)
- 🔐 Xác thực 2 lớp với Telegram + SMS
- 💬 Giao diện nhắn tin hiện đại
- 🎨 Theme bò sữa đáng yêu
- 📲 Responsive design
- 🌙 Dark mode support

## 🚀 Demo Live

**Website:** [Đang cập nhật...]

## 🛠 Cài đặt Local

```bash
# Clone repository
git clone [repository-url]
cd cown

# Cài đặt dependencies
npm install

# Cấu hình environment
cp .env.example .env
# Chỉnh sửa .env với thông tin của bạn

# Chạy development server
npm run dev

# Hoặc production
npm start
```

## 📦 Deployment

### Render (Recommended)

1. Push code lên GitHub
2. Tạo tài khoản [Render](https://render.com)
3. Tạo Web Service mới từ GitHub repo
4. Cấu hình:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node.js
   - **Port:** 3000

### Environment Variables (Render)

```
NODE_ENV=production
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=cown_telegram
SESSION_SECRET=your_secret_key
```

## 🗃 Database

Ứng dụng hỗ trợ MySQL. Bạn có thể sử dụng:
- **PlanetScale** (MySQL miễn phí)
- **Aiven** (MySQL miễn phí)
- **Railway** (MySQL)

## 📱 Features

### Authentication
- ✅ Phone OTP login
- ✅ Telegram integration
- ✅ SMS fallback
- ✅ Auto-registration
- ✅ Session management

### UI/UX
- ✅ Modern gradient buttons
- ✅ Smooth animations
- ✅ Loading states
- ✅ Error handling
- ✅ Mobile responsive
- ✅ Accessibility support

### Pages
- 🏠 `fixed-login.html` - Main login page (recommended)
- 📱 `login-phone.html` - Original login page
- 🧪 `minimal-test.html` - Simple test page
- 💬 `app-main.html` - Main messaging interface

## 🎨 Customization

Chỉnh sửa CSS variables trong `auth-phone.css`:

```css
:root {
  --cow-brown: #8B5A3C;
  --cow-brown-dark: #7A4F35;
  --cow-brown-light: #B8956A;
  /* ... */
}
```

## 📞 Support

- 📧 Email: nghia@example.com
- 🐛 Issues: [GitHub Issues]
- 📖 Documentation: [Wiki]

## 📄 License

MIT License - Sử dụng tự do!

---

Made with ❤️ and 🥛 by Nghia
