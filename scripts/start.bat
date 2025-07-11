@echo off
echo ========================================
echo    Cown - Telegram Messaging App
echo ========================================
echo.

REM Kiểm tra Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js không được cài đặt!
    echo Vui lòng cài đặt Node.js từ https://nodejs.org
    pause
    exit /b 1
)

REM Kiểm tra file .env
if not exist ".env" (
    echo [WARNING] File .env không tồn tại!
    echo Đang tạo file .env từ .env.example...
    copy ".env.example" ".env"
    echo.
    echo [INFO] File .env đã được tạo với cấu hình mặc định
    echo Ứng dụng sẽ yêu cầu đăng nhập Telegram khi chạy lần đầu
    echo.
)

REM Kiểm tra dependencies
if not exist "node_modules" (
    echo [INFO] Đang cài đặt dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Cài đặt dependencies thất bại!
        pause
        exit /b 1
    )
)

REM Tạo thư mục database
if not exist "database" (
    mkdir database
    echo [INFO] Đã tạo thư mục database
)

echo [INFO] Khởi động Cown Telegram App...
echo [INFO] Ứng dụng sẽ chạy tại: http://localhost:3000
echo [INFO] Bấm Ctrl+C để dừng server
echo.

REM Khởi động server
npm start
