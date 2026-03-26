$response = Invoke-WebRequest -Uri "http://localhost:5000/api/standard-cards" -Method GET
$data = $response.Content | ConvertFrom-Json
Write-Host "API Response:"
$data | ConvertTo-Json -Depth 3
