@echo off
:: DAWN.BAT - Quick Launcher for DAWN Protocol
:: Double-click to initiate full multi-agent god mode startup
title gAIng Collective - DAWN Protocol
cd /d "%~dp0"

echo.
echo =====================================================
echo      D A W N   P R O T O C O L   I N I T I A T I N G
echo =====================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0DAWN.ps1" %*

if errorlevel 1 (
    echo.
    echo [ERROR] DAWN Protocol failed. Check logs.
    pause
)
