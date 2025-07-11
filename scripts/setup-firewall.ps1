# Open Windows Firewall for Cown Telegram App
# Run this script as Administrator

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "    Windows Firewall Configuration" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ Script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    # Check if rule already exists
    $existingRule = Get-NetFirewallRule -DisplayName "Cown Telegram App" -ErrorAction SilentlyContinue
    
    if ($existingRule) {
        Write-Host "⚠️  Firewall rule already exists, removing old rule..." -ForegroundColor Yellow
        Remove-NetFirewallRule -DisplayName "Cown Telegram App"
    }
    
    # Create new firewall rule
    Write-Host "Creating firewall rule for port 3001..." -ForegroundColor Yellow
    New-NetFirewallRule -DisplayName "Cown Telegram App" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -Profile Any
    
    Write-Host "✅ Firewall rule created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Port 3001 is now open for inbound connections" -ForegroundColor White
    Write-Host "Your app can be accessed from other devices on the network" -ForegroundColor White
    
} catch {
    Write-Host "❌ Failed to create firewall rule: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔧 Network Access Information:" -ForegroundColor Cyan
Write-Host "- Local: http://localhost:3001" -ForegroundColor White
Write-Host "- Network: http://192.168.0.65:3001" -ForegroundColor White
Write-Host "- Network: http://172.21.176.1:3001" -ForegroundColor White
Write-Host "- Network: http://172.27.208.1:3001" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue"
