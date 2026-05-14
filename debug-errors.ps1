$loginResp = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}' -ErrorAction Stop
$token = $loginResp.data.token
$headers = @{ Authorization = "Bearer $token" }

Write-Output "=== Testing warehouse/transfer error details ==="
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:5000/api/warehouse/transfer" -Headers $headers -ErrorAction Stop
    $resp | ConvertTo-Json -Depth 5
} catch {
    $ex = $_.Exception
    if ($ex.Response) {
        $reader = [System.IO.StreamReader]::new($ex.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        Write-Output "Status: $($ex.Response.StatusCode)"
        Write-Output "Body: $responseBody"
    } else {
        Write-Output "Error: $($ex.Message)"
    }
}

Write-Output ""
Write-Output "=== Testing qrcode/records error details ==="
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:5000/api/qrcode/records" -Headers $headers -ErrorAction Stop
    $resp | ConvertTo-Json -Depth 5
} catch {
    $ex = $_.Exception
    if ($ex.Response) {
        $reader = [System.IO.StreamReader]::new($ex.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        Write-Output "Status: $($ex.Response.StatusCode)"
        Write-Output "Body: $responseBody"
    } else {
        Write-Output "Error: $($ex.Message)"
    }
}
