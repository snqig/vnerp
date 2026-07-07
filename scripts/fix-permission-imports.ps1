$root = 'd:\dcprint\erp-project\src\app\api'
$files = Get-ChildItem -Path $root -Filter 'route.ts' -Recurse
$changed = @()
$importLine = "import { withPermission } from '@/lib/api-permissions';"
$crlf = [char]13 + [char]10

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    if ($content -notmatch 'withPermission\(') { continue }
    $orig = $content

    $content = $content -replace 'withErrorHandler,\s*', ''
    $content = $content -replace ',\s*withErrorHandler', ''
    $content = $content -replace "import \{\s*\} from '@/lib/api-response';\s*\r?\n", ''

    if ($content -notmatch "from '@/lib/api-permissions'") {
        $rx = New-Object System.Text.RegularExpressions.Regex ('(?m)^import\s+[^;]+;\s*')
        $mc = $rx.Matches($content)
        if ($mc.Count -gt 0) {
            $last = $mc[$mc.Count - 1]
            $pos = $last.Index + $last.Length
            $content = $content.Substring(0, $pos) + $importLine + $crlf + $content.Substring($pos)
        } else {
            $content = $importLine + $crlf + $content
        }
    }

    if ($content -ne $orig) {
        $enc = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($file.FullName, $content, $enc)
        $changed += $file.FullName.Substring('d:\dcprint\erp-project\'.Length)
    }
}

Write-Host ('=== Fixed imports in ' + $changed.Count + ' files ===')
foreach ($c in $changed) { Write-Host ('  ' + $c) }
