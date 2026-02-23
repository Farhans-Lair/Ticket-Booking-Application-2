# 1. Configuration
$baseUrl = "http://localhost:3000/auth"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "user_$timestamp@example.com"

# 2. Registration Step
$regData = @{
    name     = "Shayan Sheikh"
    email    =  "pardarsh637@gmail.com"
    password = "Password@123"
}

Write-Host "--- Starting Registration ---" -ForegroundColor Cyan
try {
    $regResponse = Invoke-RestMethod -Uri "$baseUrl/register" `
        -Method Post `
        -Body ($regData | ConvertTo-Json) `
        -ContentType "application/json" `
        -ResponseHeadersVariable "regHeaders"
    
    Write-Host "Registration Successful! Status: 201 Created" -ForegroundColor Green
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "Registration Failed! Status Code: $code" -ForegroundColor Red
    return # Stop script if registration fails
}

# 3. Login Step (Using same credentials)
$loginData = @{
    email    = "pardarsh637@gmail.com"
    password = "Password@123"
}

Write-Host "`n--- Starting Login ---" -ForegroundColor Cyan
try {
    # Using WebRequest to explicitly check the response code
    $loginResult = Invoke-WebRequest -Uri "$baseUrl/login" `
        -Method Post `
        -Body ($loginData | ConvertTo-Json) `
        -ContentType "application/json" `
        -SkipHttpErrorCheck

    Write-Host "Login HTTP Status: $($loginResult.StatusCode)" -ForegroundColor Yellow

    if ($loginResult.StatusCode -eq 200) {
        $jsonResponse = $loginResult.Content | ConvertFrom-Json
        $authToken = $jsonResponse.token
        Write-Host "Login Successful! Token received." -ForegroundColor Green
    } else {
        Write-Host "Login Denied: $($loginResult.Content)" -ForegroundColor Red
    }
} catch {
    Write-Host "Critical error during login: $($_.Exception.Message)" -ForegroundColor Red
}
