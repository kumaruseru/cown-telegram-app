@echo off
:menu
cls
echo ==========================================
echo     Cown Telegram App - Launch Options
echo ==========================================
echo.
echo 1. Local only (localhost:3001)
echo 2. Network access (all devices on LAN)
echo 3. Custom domain setup (requires admin)
echo 4. Public tunnel with ngrok
echo 5. Setup firewall (requires admin)
echo 6. Exit
echo.
set /p choice="Choose an option (1-6): "

if "%choice%"=="1" goto local
if "%choice%"=="2" goto network
if "%choice%"=="3" goto domain
if "%choice%"=="4" goto ngrok
if "%choice%"=="5" goto firewall
if "%choice%"=="6" goto exit
echo Invalid choice. Please try again.
pause
goto menu

:local
echo.
echo Starting in local mode...
set HOST=localhost
set PORT=3001
npm run dev
goto end

:network
echo.
echo Starting with network access...
start start-network.bat
goto end

:domain
echo.
echo Setting up custom domains...
echo This requires Administrator privileges.
pause
powershell -Command "Start-Process PowerShell -ArgumentList '-ExecutionPolicy Bypass -File setup-domain.ps1' -Verb RunAs"
pause
start start-domain.bat
goto end

:ngrok
echo.
echo Setting up public tunnel...
echo Make sure ngrok is installed and configured.
echo Run install-ngrok.ps1 first if needed.
pause
echo Starting app...
start cmd /k "npm run dev"
echo Starting ngrok...
start cmd /k "ngrok http 3001"
goto end

:firewall
echo.
echo Configuring Windows Firewall...
echo This requires Administrator privileges.
pause
powershell -Command "Start-Process PowerShell -ArgumentList '-ExecutionPolicy Bypass -File setup-firewall.ps1' -Verb RunAs"
pause
goto menu

:exit
exit

:end
echo.
echo App is starting... Check the new window(s).
pause
