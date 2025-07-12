@echo off
echo ==========================================
echo     Cown Telegram App - Custom Domain
echo ==========================================
echo.
echo To use custom domain, first run this as Administrator:
echo echo 192.168.0.65 cown.local ^>^> C:\Windows\System32\drivers\etc\hosts
echo.
echo Then access at:
echo - http://localhost:3001
echo - http://cown.local:3001
echo - http://192.168.0.65:3001
echo.
echo Press Ctrl+C to stop
echo ==========================================
echo.

set HOST=0.0.0.0
set PORT=3001
set NODE_ENV=development

npm run dev
