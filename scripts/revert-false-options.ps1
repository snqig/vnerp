# 撤销误转换：在 tsc 报错的行上将 { errorMessage: '...' } 还原为 '...'
$root = 'd:\dcprint\erp-project'
Set-Location $root
$tscOutput = & npx tsc --noEmit 2>&1
$errors = $tscOutput | Select-String -Pattern 'error TS2345'

# 用 .NET 字典显式声明，避免 PowerShell hashtable 作用域问题
$fileLines = New-Object 'System.Collections.Generic.Dictionary[string,System.Collections.Generic.HashSet[int]]'

foreach ($err in $errors) {
    $line = $err.Line
    if ($line -match '([^(]+)\((\d+),') {
        $file = $matches[1]
        $lineNum = [int]$matches[2]
        if (-not $fileLines.ContainsKey($file)) {
            $fileLines[$file] = New-Object 'System.Collections.Generic.HashSet[int]'
        }
        [void]$fileLines[$file].Add($lineNum)
    }
}

Write-Host ('Found ' + $fileLines.Count + ' files with TS2345 errors')

$changed = @()
foreach ($kv in $fileLines) {
    $file = $kv.Key
    $lineNums = $kv.Value
    $fullPath = Join-Path $root $file
    if (-not (Test-Path $fullPath)) { continue }
    $content = [System.IO.File]::ReadAllText($fullPath, [System.Text.Encoding]::UTF8)
    # 用 .NET 分割，保留所有换行符
    $lines = $content -split "`r`n|`n"
    $orig = $content

    foreach ($ln in $lineNums) {
        $idx = $ln - 1
        if ($idx -lt $lines.Length) {
            # 将 { errorMessage: '...' } 还原为 '...'
            $lines[$idx] = [regex]::Replace($lines[$idx], "\{\s*errorMessage:\s*'([^']+)'\s*\}", "'`$1'")
        }
    }
    $newContent = $lines -join "`r`n"
    if ($newContent -ne $orig) {
        $enc = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($fullPath, $newContent, $enc)
        $changed += $file
    }
}

Write-Host ('=== Reverted false options in ' + $changed.Count + ' files ===')
foreach ($c in $changed) { Write-Host ('  ' + $c) }
