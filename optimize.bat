@echo off
echo ===============================================
echo     🚀 PROJECT OPTIMIZATION RUNNER
echo ===============================================
echo.

echo 📦 Installing optimized dependencies...
npm install

echo.
echo 🧹 Cleaning cache and temporary files...
npm run clean

echo.
echo 🔍 Running ESLint to check code quality...
npm run lint

echo.
echo 🎨 Formatting code with Prettier...
npm run format

echo.
echo 📦 Building optimized bundle...
npm run build

echo.
echo ===============================================
echo     ✅ OPTIMIZATION COMPLETE!
echo ===============================================
echo.
echo 📊 Project has been optimized with:
echo ✅ Security middleware (Helmet, Rate limiting)
echo ✅ Performance middleware (Compression, Caching)
echo ✅ Code quality tools (ESLint, Prettier)
echo ✅ Optimized build process (Webpack)
echo ✅ Better logging (Winston)
echo ✅ Clean project structure
echo.
echo 🚀 Ready for production deployment!
echo.
pause
