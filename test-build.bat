@echo off
echo ===============================================
echo     🔨 LOCAL BUILD TEST
echo ===============================================
echo.
echo Testing Docker build locally before Render deployment...
echo.

REM Build Docker image
echo 📦 Building Docker image...
docker build -t cown-telegram-app-test .

if %errorlevel% neq 0 (
    echo ❌ Docker build failed!
    echo Check the logs above for errors.
    pause
    exit /b 1
)

echo ✅ Docker build successful!
echo.

REM Test run container
echo 🚀 Testing container startup...
docker run --rm -d --name cown-test -p 3002:3000 cown-telegram-app-test

if %errorlevel% neq 0 (
    echo ❌ Container failed to start!
    pause
    exit /b 1
)

echo ⏳ Waiting for container to start...
timeout /t 10 /nobreak >nul

REM Test health check
echo 🔍 Testing health check...
curl -f http://localhost:3002/health

if %errorlevel% equ 0 (
    echo.
    echo ✅ Health check passed!
    echo ✅ Container is working correctly!
) else (
    echo.
    echo ⚠️  Health check failed, but container may still be starting...
)

echo.
echo 🧹 Cleaning up test container...
docker stop cown-test >nul 2>&1

echo.
echo ===============================================
echo     🎯 BUILD TEST COMPLETE
===============================================
echo.
echo If this test passed, your Render deployment should work!
echo If there were errors, fix them before deploying to Render.
echo.
pause
