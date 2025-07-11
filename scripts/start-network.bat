@echo off
echo ==========================================
echo     Cown Telegram App - Local Network
echo ==========================================
echo.
echo Starting application on all network interfaces...
echo.
echo Available at:
echo - Local:    http://localhost:3001
echo - Network:  http://192.168.0.65:3001
echo - Network:  http://172.21.176.1:3001
echo - Network:  http://172.27.208.1:3001
echo.
echo Press Ctrl+C to stop
echo ==========================================
echo.

set HOST=0.0.0.0
set PORT=3001
set NODE_ENV=development

npm run dev
