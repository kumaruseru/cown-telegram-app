@echo off
:monitor
cls
echo ===============================================
echo     📊 RENDER DEPLOYMENT MONITOR
echo ===============================================
echo.
echo 🎯 Target URL: https://cown-telegram-app.onrender.com
echo 🔍 Health Check: https://cown-telegram-app.onrender.com/health
echo.
echo Testing deployment status...
echo.

REM Test if site is accessible
curl -s -o nul -w "%%{http_code}" https://cown-telegram-app.onrender.com > temp_status.txt 2>nul
if exist temp_status.txt (
    set /p status=<temp_status.txt
    del temp_status.txt >nul 2>&1
) else (
    set status=000
)

if "%status%"=="200" (
    echo ✅ SUCCESS! App is LIVE and responding
    echo 🌐 Your app is now publicly accessible at:
    echo    https://cown-telegram-app.onrender.com
    echo.
    echo 🎉 Deployment completed successfully!
    echo.
    echo Opening your live app...
    start https://cown-telegram-app.onrender.com
    echo.
    goto end
) else if "%status%"=="000" (
    echo ⏳ Still building... (No response yet)
) else (
    echo ⚠️  Getting HTTP %status% - App may still be starting up
)

echo.
echo 🔄 Will check again in 30 seconds...
echo 💡 Press Ctrl+C to stop monitoring
echo.
timeout /t 30 /nobreak >nul
goto monitor

:end
echo ===============================================
echo     🎊 DEPLOYMENT COMPLETE!
echo ===============================================
echo.
echo Your Cown Telegram App is now live at:
echo 🌍 https://cown-telegram-app.onrender.com
echo 🔍 Health: https://cown-telegram-app.onrender.com/health
echo.
echo Share this URL with anyone to access your app!
echo.
pause
