@echo off
echo ==========================================
echo     Cown Telegram App - Public Access
echo ==========================================
echo.
echo Setting up public access for your app...
echo.

REM Check if app is running
echo Checking if app is running on port 3001...
netstat -an | findstr :3001 >nul
if %errorlevel% neq 0 (
    echo ❌ App is not running on port 3001
    echo Please start the app first with: npm run dev
    echo.
    pause
    exit /b 1
)

echo ✅ App is running on port 3001
echo.

REM Check if ngrok is installed
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ngrok not found in PATH
    echo Please restart your terminal and try again
    echo Or install manually from: https://ngrok.com/download
    echo.
    pause
    exit /b 1
)

echo ✅ Ngrok is available
echo.

REM Get ngrok authtoken if not set
echo Please follow these steps if this is your first time:
echo 1. Sign up for free at: https://ngrok.com/signup
echo 2. Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken
echo 3. Run: ngrok config add-authtoken YOUR_AUTHTOKEN
echo.
echo Press any key to start public tunnel...
pause >nul

echo.
echo ==========================================
echo         Starting Public Tunnel
echo ==========================================
echo.
echo Your app will be available at a public URL
echo Keep this terminal open to maintain the tunnel
echo Press Ctrl+C to stop the tunnel
echo.

ngrok http 3001
