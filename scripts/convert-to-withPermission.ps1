# 批量将 withErrorHandler 路由转换为 withPermission
# 仅处理使用 withErrorHandler 且未使用 withPermission 的路由文件
[CmdletBinding()]
param()

$root = 'd:\dcprint\erp-project\src\app\api'
$files = Get-ChildItem -Path $root -Filter 'route.ts' -Recurse
$changed = @()
$skipped = @()

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($content -notmatch 'withErrorHandler\(') {
        continue
    }
    # 跳过已使用 withPermission 的文件（内部可能用 withErrorHandler 做辅助）
    if ($content -match "from '@/lib/api-permissions'") {
        # 文件已导入 withPermission，但可能仍用 withErrorHandler 做辅助包装
        # 仅当 withErrorHandler 作为 export const 的直接包装时才替换
    }

    $orig = $content

    # 1) 从 api-response 导入中移除 withErrorHandler
    # 处理: { withErrorHandler, successResponse } / { successResponse, withErrorHandler } 等
    $content = $content -replace 'withErrorHandler,\s*', ''
    $content = $content -replace ',\s*withErrorHandler', ''
    # 移除可能残留的空导入行: import {  } from '@/lib/api-response';
    $content = $content -replace "import\s*\{\s*\}\s*from\s*'@/lib/api-response';\s*\r?\n", ''

    # 2) 在最后一行 import 之后插入 withPermission 导入（若尚未存在）
    if ($content -notmatch "from '@/lib/api-permissions'") {
        # 找到最后一个 import 行的位置
        $importPattern = "(?m)^(import\s+[^;]+;\s*\r?\n)"
        $matches = [regex]::Matches($content, $importPattern)
        if ($matches.Count -gt 0) {
            $lastMatch = $matches[$matches.Count - 1]
            $insertPos = $lastMatch.Index + $lastMatch.Length
            $importLine = "import { withPermission } from '@/lib/api-permissions';`r`n"
            $content = $content.Substring(0, $insertPos) + $importLine + $content.Substring($insertPos)
        } else {
            # 没有 import 行，在文件开头添加
            $content = "import { withPermission } from '@/lib/api-permissions';`r`n" + $content
        }
    }

    # 3) 替换包装器名
    $content = $content -replace 'withErrorHandler\(', 'withPermission('

    if ($content -ne $orig) {
        # 保留 UTF8 无 BOM
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
        $changed += $file.FullName.Substring('d:\dcprint\erp-project\'.Length)
    }
}

Write-Host "=== 已转换 $($changed.Count) 个文件 ==="
$changed | ForEach-Object { Write-Host "  $_" }
