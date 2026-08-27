# 修复 withPermission 的字符串第二参数为 options 对象，并移除重复导入
$root = 'd:\dcprint\erp-project\src\app\api'
$files = Get-ChildItem -Path $root -Filter 'route.ts' -Recurse
$changed = @()

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $orig = $content

    # 1) 将字符串第二参数转为 options 对象
    # 模式: },\s*'错误消息'\s*);  →  }, { errorMessage: '错误消息' });
    $content = [regex]::Replace($content, "(\},\s*)'([^']+)'(\s*\);)", '$1{ errorMessage: ''$2'' }$3')

    # 2) 移除重复的 withPermission 导入行
    $importLine = "import { withPermission } from '@/lib/api-permissions';"
    $firstIdx = $content.IndexOf($importLine)
    if ($firstIdx -ge 0) {
        $secondIdx = $content.IndexOf($importLine, $firstIdx + $importLine.Length)
        if ($secondIdx -ge 0) {
            # 移除第二次出现（连同其后的换行）
            $content = $content.Substring(0, $secondIdx) + $content.Substring($secondIdx + $importLine.Length)
            # 清理可能残留的空行
            $content = [regex]::Replace($content, "import \{ withPermission \} from '@/lib/api-permissions';\r?\n\r?\n", "import { withPermission } from '@/lib/api-permissions';`r`n")
        }
    }

    if ($content -ne $orig) {
        $enc = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($file.FullName, $content, $enc)
        $changed += $file.FullName.Substring('d:\dcprint\erp-project\'.Length)
    }
}

Write-Host ('=== Fixed options/imports in ' + $changed.Count + ' files ===')
foreach ($c in $changed) { Write-Host ('  ' + $c) }
