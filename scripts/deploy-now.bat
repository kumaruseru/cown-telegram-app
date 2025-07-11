@echo off
echo ==========================================
echo     Deploy to Render - Step by Step
echo ==========================================
echo.
echo Your code has been pushed to GitHub!
echo Repository: https://github.com/kumaruseru/cown-telegram-app
echo.
echo Follow these steps to deploy to Render:
echo.
echo 1. Go to: https://render.com
echo 2. Sign in with your GitHub account
echo 3. Click "New +" -> "Web Service"
echo 4. Select repository: kumaruseru/cown-telegram-app
echo 5. Click "Connect"
echo.
echo Render will auto-detect the configuration from render.yaml
echo.
echo 6. Add these Environment Variables in Render dashboard:
echo    TELEGRAM_API_ID=20657396
echo    TELEGRAM_API_HASH=2efea0a1f070994045dfa4e82d604996
echo.
echo 7. Click "Create Web Service"
echo.
echo Your app will be available at:
echo https://cown-telegram-app.onrender.com
echo.
echo Deployment takes about 5-10 minutes.
echo.
echo ==========================================
echo           Alternative: Ngrok Setup
echo ==========================================
echo.
echo If you prefer ngrok for immediate testing:
echo.
echo 1. Download ngrok: https://ngrok.com/download
echo 2. Extract to a folder and add to PATH
echo 3. Sign up: https://ngrok.com/signup
echo 4. Get authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
echo 5. Run: ngrok config add-authtoken YOUR_TOKEN
echo 6. Start app: npm run dev:network
echo 7. In another terminal: ngrok http 3001
echo.
echo ==========================================
echo.
echo Would you like to:
echo [1] Open Render website
echo [2] Open GitHub repository
echo [3] Start local app (for ngrok)
echo [4] Exit
echo.
set /p choice="Choose option (1-4): "

if "%choice%"=="1" start https://render.com
if "%choice%"=="2" start https://github.com/kumaruseru/cown-telegram-app
if "%choice%"=="3" (
    echo Starting local app...
    npm run dev:network
)
if "%choice%"=="4" exit

echo.
pause
