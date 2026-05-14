$loginBody = '{"username":"admin","password":"admin123"}'
$loginResp = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $loginResp.data.token
$headers = @{ Authorization = "Bearer $token" }

$endpoints = @(
    "/api/warehouse/transfer",
    "/api/warehouse/stocktaking",
    "/api/standard-cards",
    "/api/material-requisitions",
    "/api/material-returns",
    "/api/auth/me",
    "/api/organization",
    "/api/production/report",
    "/api/orders/customers",
    "/api/orders/products",
    "/api/qrcode/records"
)

foreach ($ep in $endpoints) {
    Write-Output "--- Testing $ep ---"
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3000$ep" -Headers $headers -ErrorAction Stop
        Write-Output "Status: $($resp.StatusCode)"
        Write-Output "Body: $($resp.Content.Substring(0, [Math]::Min(500, $resp.Content.Length)))"
    } catch {
        $statusCode = ""
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        Write-Output "HTTP Status: $statusCode"
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $body = $reader.ReadToEnd()
            $reader.Close()
            Write-Output "Error Body: $($body.Substring(0, [Math]::Min(1000, $body.Length)))"
        } catch {
            Write-Output "Could not read error body: $($_.Exception.Message)"
        }
    }
    Write-Output ""
}
