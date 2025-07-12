# Test script for Cown Telegram App

Write-Host "Testing Cown Telegram App Flow" -ForegroundColor Cyan

# Test 1: Register
Write-Host "`nTesting registration..." -ForegroundColor Yellow
try {
    $registerData = '{"username":"flowtest","password":"123456","email":"flowtest@test.com","telegram_phone":"+84987654321"}'
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method Post -Body $registerData -ContentType "application/json" -SessionVariable session
    Write-Host "Registration successful: $($result.user.username)" -ForegroundColor Green
} catch {
    Write-Host "Registration: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Login
Write-Host "`nTesting login..." -ForegroundColor Yellow
try {
    $loginData = '{"username":"flowtest","password":"123456"}'
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $loginData -ContentType "application/json" -SessionVariable session
    Write-Host "Login successful: $($result.user.username)" -ForegroundColor Green
} catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Check main page
Write-Host "`nTesting main page access..." -ForegroundColor Yellow
try {
    $page = Invoke-WebRequest -Uri "http://localhost:3000/" -WebSession $session -UseBasicParsing
    if ($page.Content -like "*html*") {
        Write-Host "Main page accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "Main page failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Check client status
Write-Host "`nTesting Telegram client status..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "http://localhost:3000/api/client/status" -Method Get -WebSession $session
    Write-Host "Telegram connected: $($status.connected)" -ForegroundColor Blue
} catch {
    Write-Host "Client status failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nFlow test completed!" -ForegroundColor Cyan
Write-Host "Next: Login at http://localhost:3000/login and setup Telegram" -ForegroundColor Yellow
