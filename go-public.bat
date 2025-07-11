@echo off
echo ==========================================
echo     Cown Telegram App - Full Public Setup
echo ==========================================
echo.

REM Check if ngrok is available
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ngrok not found. Please restart your terminal.
    echo If still not working, install from: https://ngrok.com/download
    echo.
    pause
    exit /b 1
)

echo ✅ Starting Cown Telegram App publicly...
echo.
echo This will:
echo 1. Start your app on localhost:3001
echo 2. Create a public tunnel via ngrok
echo 3. Give you a public URL to share
echo.
echo Make sure you have:
echo - Signed up at: https://ngrok.com/signup
echo - Added your authtoken: ngrok config add-authtoken YOUR_TOKEN
echo.
pause

echo.
echo Starting application...
start "Cown App" cmd /k "npm run dev:network"

echo Waiting for app to start...
timeout /t 10 /nobreak >nul

echo.
echo Starting public tunnel...
start "Public Tunnel" cmd /k "ngrok http 3001"

echo.
echo ==========================================
echo           🎉 Setup Complete!
echo ==========================================
echo.
echo Your app is now running publicly!
echo.
echo 📱 Local access: http://localhost:3001
echo 🌍 Public access: Check the ngrok terminal for the public URL
echo.
echo The public URL will look like: https://abc123.ngrok.io
echo Share this URL with anyone to access your app!
echo.
echo Keep both terminal windows open to maintain access.
echo.
pause
