@echo off
chcp 65001 >nul
title Start Dev Server - pnpm dev

cd /d "D:\dcprint\erp-project"

echo Checking pnpm installation...
where pnpm >nul 2>&1
if errorlevel 1 (
    echo Error: pnpm not found. Please install with "npm install -g pnpm"
    pause
    exit /b
)

if not exist "node_modules\" (
    echo node_modules not found, installing dependencies...
    call pnpm install
    if errorlevel 1 (
        echo Dependency installation failed.
        pause
        exit /b
    )
)

echo Starting dev server...
call pnpm dev

pause