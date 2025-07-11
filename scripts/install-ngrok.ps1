# Install and setup ngrok for public tunneling
# Run this script as Administrator

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "    Ngrok Installation & Setup" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if ngrok is already installed
try {
    $version = ngrok version
    Write-Host "✅ Ngrok is already installed: $version" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing ngrok..." -ForegroundColor Yellow
    
    # Download ngrok
    $ngrokUrl = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
    $downloadPath = "$env:TEMP\ngrok.zip"
    $extractPath = "$env:ProgramFiles\ngrok"
    
    try {
        # Create directory
        if (!(Test-Path $extractPath)) {
            New-Item -ItemType Directory -Path $extractPath -Force | Out-Null
        }
        
        # Download
        Write-Host "Downloading ngrok..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $ngrokUrl -OutFile $downloadPath
        
        # Extract
        Write-Host "Extracting ngrok..." -ForegroundColor Yellow
        Expand-Archive -Path $downloadPath -DestinationPath $extractPath -Force
        
        # Add to PATH
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", [EnvironmentVariableTarget]::Machine)
        if ($currentPath -notlike "*$extractPath*") {
            [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$extractPath", [EnvironmentVariableTarget]::Machine)
            Write-Host "✅ Added ngrok to system PATH" -ForegroundColor Green
        }
        
        # Cleanup
        Remove-Item $downloadPath -Force
        
        Write-Host "✅ Ngrok installed successfully!" -ForegroundColor Green
        
    } catch {
        Write-Host "❌ Failed to install ngrok: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🔧 Setup Instructions:" -ForegroundColor Cyan
Write-Host "1. Sign up for free at: https://ngrok.com/signup" -ForegroundColor White
Write-Host "2. Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
Write-Host "3. Run: ngrok config add-authtoken YOUR_AUTHTOKEN" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Usage:" -ForegroundColor Cyan
Write-Host "1. Start your app: npm run dev" -ForegroundColor White
Write-Host "2. In another terminal: ngrok http 3001" -ForegroundColor White
Write-Host "3. Access your app via the ngrok URL (e.g., https://abc123.ngrok.io)" -ForegroundColor White
Write-Host ""

# Create ngrok start script
$ngrokScript = @"
@echo off
echo ==========================================
echo     Cown Telegram App - Public Tunnel
echo ==========================================
echo.
echo Make sure your app is running first!
echo Run 'npm run dev' in another terminal
echo.
echo Starting ngrok tunnel...
echo ==========================================
echo.

ngrok http 3001
"@

$ngrokScript | Out-File -FilePath "start-ngrok.bat" -Encoding ASCII

Write-Host "✅ Created start-ngrok.bat script" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to continue"
