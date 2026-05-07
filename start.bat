@echo off
chcp 65001 >nul 2>&1
title ERP System - Silk Screen Printing Management
color 0A

echo ==========================================
echo   丝印ERP系统 - 启动脚本
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/4] 检查Node.js环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js 版本: %NODE_VER%

echo.
echo [2/4] 检查依赖包...
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
echo [3/4] 清理缓存...
if exist ".next" (
    rmdir /s /q ".next" 2>nul
    echo [OK] .next 缓存已清理
) else (
    echo [OK] 无需清理
)

echo.
echo [4/4] 启动开发服务器...
echo ==========================================
echo   访问地址: http://localhost:5000
echo   管理员账号: admin / admin123
echo   按 Ctrl+C 停止服务器
echo ==========================================
echo.

call npx next dev -p 5000

pause
