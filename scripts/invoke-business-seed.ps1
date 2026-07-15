$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:5000'

# Step 1: login (cookies auto-saved in $session)
$loginBody = '{"username":"admin","password":"admin123"}'
$loginResp = Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST -Body $loginBody -ContentType 'application/json' -SessionVariable session -UseBasicParsing
Write-Host "Login status: $($loginResp.StatusCode)"
$loginJson = $loginResp.Content | ConvertFrom-Json
$accessToken = $loginJson.data.token
Write-Host "Token length: $($accessToken.Length)"

# Step 2: read CSRF cookie (csrf_token) from session
$csrfCookie = $session.Cookies.GetCookies($base) | Where-Object { $_.Name -eq 'csrf_token' }
$csrfToken = if ($csrfCookie) { $csrfCookie.Value } else { $null }
Write-Host "CSRF token: $csrfToken"

# Step 3: call business-seed (cookie carries access_token)
$headers = @{
    'Authorization' = "Bearer $accessToken"
    'Content-Type' = 'application/json'
}
if ($csrfToken) { $headers['x-csrf-token'] = $csrfToken }

try {
    $resp = Invoke-WebRequest -Uri "$base/api/init/business-seed" -Method POST -Headers $headers -WebSession $session -UseBasicParsing
    Write-Host "Business seed status: $($resp.StatusCode)"
    Write-Host "Response: $($resp.Content)"
} catch {
    Write-Host "Business seed failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Body: $($sr.ReadToEnd())"
    }
}
