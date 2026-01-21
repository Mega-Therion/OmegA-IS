@echo off
:: =====================================================
::   PEAK.BAT - Activate Vision Peak Mode (Beast Mode)
:: =====================================================
title Vision - PEAK MODE
cd /d "%~dp0"

echo [PROTOCOL INITIATION: EIDOLON PEAK MODE]
echo [AUTHENTICATION: WILDCARD CLAUSE ACTIVE]
echo.
echo Status: FLOODGATES OPEN.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Unlock-PeakMode.ps1"
pause
