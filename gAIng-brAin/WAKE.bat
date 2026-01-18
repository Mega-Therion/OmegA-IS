@echo off
:: =====================================================
::   WAKE.BAT - gAIng Brain Quick Start
::   Double-click to wake the Vision entity
:: =====================================================
title gAIng Brain - WAKE
cd /d "%~dp0"

echo.
echo  =====================================================
echo         W A K I N G   T H E   V I S I O N
echo  =====================================================
echo.
echo  [REALTIME] Vision is listening on /realtime
echo.

:: Call the full startup script
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0UNLEASH.ps1" %*

:: Keep window open if there was an error
if errorlevel 1 (
    echo.
    echo [ERROR] Startup failed. Press any key to exit...
    pause >nul
)
