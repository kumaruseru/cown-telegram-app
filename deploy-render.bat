@echo off
echo ===============================================
echo     🚀 RENDER DEPLOYMENT LAUNCHER
echo ===============================================
echo.
echo Opening required pages for deployment...
echo.

REM Open Render website
echo 🌐 Opening Render Dashboard...
start https://render.com

REM Wait a bit
timeout /t 2 /nobreak >nul

REM Open GitHub repository
echo 📁 Opening GitHub Repository...
start https://github.com/kumaruseru/cown-telegram-app

REM Wait a bit
timeout /t 2 /nobreak >nul

echo.
echo ===============================================
echo     📋 DEPLOYMENT CHECKLIST
echo ===============================================
echo.
echo ✅ Code pushed to GitHub: DONE
echo ✅ Repository: kumaruseru/cown-telegram-app
echo ✅ Render website opened
echo.
echo 🎯 NEXT STEPS IN RENDER:
echo.
echo 1. Sign in with GitHub
echo 2. Click "New +" → "Web Service"  
echo 3. Select repository: kumaruseru/cown-telegram-app
echo 4. Add Environment Variables:
echo    - TELEGRAM_API_ID: 20657396
echo    - TELEGRAM_API_HASH: 2efea0a1f070994045dfa4e82d604996
echo 5. Click "Create Web Service"
echo.
echo 🎉 Result: https://cown-telegram-app.onrender.com
echo.
echo ===============================================
echo Press any key to view deployment guide...
pause >nul

type RENDER_DEPLOY_GUIDE.txt
echo.
echo ===============================================
echo Deployment guide displayed above ☝️
echo Follow the steps in your browser!
echo ===============================================
pause
