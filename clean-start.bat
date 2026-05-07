@echo off
chcp 65001 >nul 2>&1
title ERP System - Deep Clean & Start
color 0C

echo ==========================================
echo   丝印ERP系统 - 深度清理并启动
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/5] 停止现有Node进程...
taskkill /f /im node.exe >nul 2>&1
echo [OK] Node进程已停止

echo.
echo [2/5] 清理所有缓存...
if exist ".next" (
    rmdir /s /q ".next" 2>nul
    echo [OK] .next 已清理
)
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache" 2>nul
    echo [OK] node_modules\.cache 已清理
)
if exist ".turbo" (
    rmdir /s /q ".turbo" 2>nul
    echo [OK] .turbo 已清理
)
del /s /q "*.tmp" >nul 2>&1
echo [OK] 临时文件已清理

echo.
echo [3/5] 检查依赖包...
if not exist "node_modules" (
    echo [安装] 正在安装依赖包...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo [OK] 依赖包已存在
)

echo.
echo [4/5] TypeScript类型检查...
call npx tsc --noEmit 2>nul
if %errorlevel% equ 0 (
    echo [OK] TypeScript检查通过
) else (
    echo [警告] TypeScript检查有错误，但不影响启动
)

echo.
echo [5/5] 启动开发服务器...
echo ==========================================
echo   访问地址: http://localhost:5000
echo   管理员账号: admin / admin123
echo   按 Ctrl+C 停止服务器
echo ==========================================
echo.

call npx next dev -p 5000

pause
