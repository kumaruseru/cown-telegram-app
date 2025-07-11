# Setup Custom Domain for Cown Telegram App
# Run this script as Administrator

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "    Cown Telegram App - Domain Setup" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ Script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

$hostsFile = "C:\Windows\System32\drivers\etc\hosts"
$domains = @(
    "192.168.0.65 cown.local",
    "192.168.0.65 cown-telegram.local",
    "192.168.0.65 app.cown.local"
)

Write-Host "Setting up custom domains..." -ForegroundColor Green

foreach ($domain in $domains) {
    $existing = Get-Content $hostsFile | Select-String $domain
    if (-not $existing) {
        Add-Content -Path $hostsFile -Value $domain
        Write-Host "✅ Added: $domain" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Already exists: $domain" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎉 Domain setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now access your app at:" -ForegroundColor Cyan
Write-Host "- http://cown.local:3001" -ForegroundColor White
Write-Host "- http://cown-telegram.local:3001" -ForegroundColor White
Write-Host "- http://app.cown.local:3001" -ForegroundColor White
Write-Host ""

# Flush DNS cache
Write-Host "Flushing DNS cache..." -ForegroundColor Yellow
ipconfig /flushdns | Out-Null
Write-Host "✅ DNS cache flushed" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Ready to start your app with: npm run dev" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to continue"
