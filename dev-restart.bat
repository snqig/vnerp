@echo off
REM ================================================================
REM  vnERP / dev server 一键干净重启
REM  三步合一：1) 停掉 next dev   2) 清 .next 缓存   3) 重新 npm run dev
REM
REM  用途：解决 Turbopack .next 缓存 EPERM 损坏导致的
REM        "ELIFECYCLE Command failed with exit code 1" 反复崩溃
REM
REM  用法：双击本文件，或在终端里执行  ./dev-restart.bat
REM  停止服务：在本窗口按 Ctrl+C
REM
REM  安全设计：
REM    优先只杀命令行含 "next dev" / "next-server" 的 node 进程，
REM    不会误杀其它 node 程序（Codex / 编辑器后台 node 等）。
REM    仅当 .next 仍被占用导致删不掉时，才回退到 taskkill 全量 node.exe。
REM ================================================================

cd /d "%~dp0"

echo ================================================================
echo  vnERP dev-restart   kill next dev -^> rm .next -^> npm run dev
echo ================================================================
echo.

echo [1/3] 停止现有 next dev 进程...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -ErrorAction SilentlyContinue ^| Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*next dev*' -or $_.CommandLine -like '*next-server*') } ^| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; Write-Host ('      killed PID ' + $_.ProcessId) }"
echo       等待文件锁释放...
timeout /t 2 /nobreak >nul

echo [2/3] 清空 .next 缓存...
if exist ".next" (
  rmdir /s /q ".next" >nul 2>&1
  if exist ".next" (
    echo       缓存仍被占用，回退：结束全部 node.exe 后重试
    taskkill /F /IM node.exe /T >nul 2>&1
    timeout /t 2 /nobreak >nul
    rmdir /s /q ".next" >nul 2>&1
  )
  if exist ".next" (
    echo       [ERROR] .next 删除失败，可能仍有进程占用，请手动检查
    pause
    exit /b 1
  )
  echo       .next 已删除
) else (
  echo       .next 不存在，跳过
)

echo [3/3] 启动全新 dev server，端口 5000
echo.
echo ================================================================
echo  Ready 后访问： http://localhost:5000/login
echo  停止服务：在本窗口按 Ctrl+C
echo ================================================================
echo.

npm run dev
