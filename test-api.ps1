$ErrorActionPreference = "Continue"
$results = @()

$loginBody = '{"username":"admin","password":"admin123"}'
$loginResp = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $loginResp.data.token
Write-Output "=== LOGIN SUCCESS, token obtained ==="

$headers = @{ Authorization = "Bearer $token" }

function Test-Endpoint {
    param([string]$Module, [string]$Endpoint)
    $url = "http://localhost:3000/api/$Endpoint"
    try {
        $resp = Invoke-RestMethod -Uri $url -Headers $headers -ErrorAction Stop
        $code = $resp.code
        $success = $resp.success
        $hasData = $null -ne $resp.data
        $hasList = $null -ne $resp.data.list
        $hasTotal = $null -ne $resp.data.total
        $hasPage = $null -ne $resp.data.page
        $hasPageSize = $null -ne $resp.data.pageSize
        $msg = $resp.message
        
        $formatOk = $true
        $formatIssues = @()
        if ($hasData -and $resp.data -is [System.Collections.IDictionary]) {
            if (-not $hasList) { $formatOk = $false; $formatIssues += "missing 'list'" }
            if (-not $hasTotal) { $formatOk = $false; $formatIssues += "missing 'total'" }
            if (-not $hasPage) { $formatOk = $false; $formatIssues += "missing 'page'" }
            if (-not $hasPageSize) { $formatOk = $false; $formatIssues += "missing 'pageSize'" }
        }
        
        if ($code -eq 200 -and $success -eq $true) {
            if ($formatOk) {
                Write-Output "  PASS | /api/$Endpoint | code=$code hasData=$hasData list=$hasList total=$hasTotal page=$hasPage pageSize=$hasPageSize"
                return @{ Module=$Module; Endpoint="/api/$Endpoint"; Status="PASS"; Code=$code; Format="OK"; Error="" }
            } else {
                $issues = $formatIssues -join ","
                Write-Output "  WARN | /api/$Endpoint | code=$code hasData=$hasData FORMAT_ISSUES: $issues"
                return @{ Module=$Module; Endpoint="/api/$Endpoint"; Status="WARN"; Code=$code; Format="ISSUES: $issues"; Error="" }
            }
        } else {
            Write-Output "  FAIL | /api/$Endpoint | code=$code success=$success msg=$msg"
            return @{ Module=$Module; Endpoint="/api/$Endpoint"; Status="FAIL"; Code=$code; Format="N/A"; Error="code=$code success=$success msg=$msg" }
        }
    } catch {
        $err = $_.Exception.Message
        $statusCode = ""
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($statusCode -eq 404) {
            Write-Output "  FAIL | /api/$Endpoint | 404 NOT FOUND"
            return @{ Module=$Module; Endpoint="/api/$Endpoint"; Status="FAIL(404)"; Code=404; Format="N/A"; Error="Route not found" }
        } elseif ($statusCode -eq 500) {
            Write-Output "  FAIL | /api/$Endpoint | 500 SERVER ERROR: $err"
            return @{ Module=$Module; Endpoint="/api/$Endpoint"; Status="FAIL(500)"; Code=500; Format="N/A"; Error=$err }
        } else {
            Write-Output "  FAIL | /api/$Endpoint | ERROR: $err"
            return @{ Module=$Module; Endpoint="/api/$Endpoint"; Status="FAIL(ERR)"; Code=$statusCode; Format="N/A"; Error=$err }
        }
    }
}

Write-Output ""
Write-Output "========== MODULE 1: System/Auth =========="
Test-Endpoint "System/Auth" "auth/me"
Test-Endpoint "System/Auth" "system/user"
Test-Endpoint "System/Auth" "system/roles"
Test-Endpoint "System/Auth" "system/dict-type"
Test-Endpoint "System/Auth" "menu"
Test-Endpoint "System/Auth" "organization"

Write-Output ""
Write-Output "========== MODULE 2: Warehouse =========="
Test-Endpoint "Warehouse" "warehouse"
Test-Endpoint "Warehouse" "warehouse/inbound"
Test-Endpoint "Warehouse" "warehouse/outbound"
Test-Endpoint "Warehouse" "warehouse/transfer"
Test-Endpoint "Warehouse" "warehouse/stocktaking"
Test-Endpoint "Warehouse" "warehouse/batch-inventory"
Test-Endpoint "Warehouse" "warehouse/inventory"
Test-Endpoint "Warehouse" "warehouse/stock-adjust"
Test-Endpoint "Warehouse" "warehouse/production-inbound"
Test-Endpoint "Warehouse" "warehouse/sales-outbound"

Write-Output ""
Write-Output "========== MODULE 3: Production =========="
Test-Endpoint "Production" "production/orders"
Test-Endpoint "Production" "workorders"
Test-Endpoint "Production" "production/bom"
Test-Endpoint "Production" "orders/bom"
Test-Endpoint "Production" "production/schedule"
Test-Endpoint "Production" "production/process"
Test-Endpoint "Production" "production/report"

Write-Output ""
Write-Output "========== MODULE 4: Sales/Purchase =========="
Test-Endpoint "Sales/Purchase" "orders/sales"
Test-Endpoint "Sales/Purchase" "sales/delivery"
Test-Endpoint "Sales/Purchase" "purchase/orders"
Test-Endpoint "Sales/Purchase" "purchase/suppliers"
Test-Endpoint "Sales/Purchase" "orders/customers"
Test-Endpoint "Sales/Purchase" "orders/products"

Write-Output ""
Write-Output "========== MODULE 5: Prepress/DCPrint =========="
Test-Endpoint "Prepress/DCPrint" "prepress/die"
Test-Endpoint "Prepress/DCPrint" "prepress/ink"
Test-Endpoint "Prepress/DCPrint" "prepress/screen-plate"
Test-Endpoint "Prepress/DCPrint" "dcprint/ink-usage"
Test-Endpoint "Prepress/DCPrint" "dcprint/process-cards"

Write-Output ""
Write-Output "========== MODULE 6: Quality =========="
Test-Endpoint "Quality" "quality/incoming"
Test-Endpoint "Quality" "quality/process"
Test-Endpoint "Quality" "quality/final"
Test-Endpoint "Quality" "quality/unqualified"

Write-Output ""
Write-Output "========== MODULE 7: Equipment =========="
Test-Endpoint "Equipment" "equipment/maintenance"
Test-Endpoint "Equipment" "equipment/repair"
Test-Endpoint "Equipment" "equipment/calibration"

Write-Output ""
Write-Output "========== MODULE 8: Finance =========="
Test-Endpoint "Finance" "finance/receivable"
Test-Endpoint "Finance" "finance/payable"
Test-Endpoint "Finance" "finance/cost"

Write-Output ""
Write-Output "========== MODULE 9: HR =========="
Test-Endpoint "HR" "hr/employees"
Test-Endpoint "HR" "organization/employee"
Test-Endpoint "HR" "hr/salary"
Test-Endpoint "HR" "hr/departments"
Test-Endpoint "HR" "organization/department"
Test-Endpoint "HR" "hr/attendance"

Write-Output ""
Write-Output "========== MODULE 10: Materials =========="
Test-Endpoint "Materials" "materials"
Test-Endpoint "Materials" "products/categories"

Write-Output ""
Write-Output "========== MODULE 11: QR Code =========="
Test-Endpoint "QR Code" "qrcode"
Test-Endpoint "QR Code" "qrcode/records"

Write-Output ""
Write-Output "========== MODULE 12: Standard Cards =========="
Test-Endpoint "Standard Cards" "standard-cards"

Write-Output ""
Write-Output "========== MODULE 13: Material Requisition =========="
Test-Endpoint "Material Requisition" "material-requisitions"
Test-Endpoint "Material Requisition" "material-returns"

Write-Output ""
Write-Output "=== ALL TESTS COMPLETE ==="
