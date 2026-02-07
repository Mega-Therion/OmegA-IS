@echo off
REM OMEGA Full Stack - One-Click Launcher
REM ======================================
REM Starts the entire OMEGA ecosystem with a single command.
REM
REM Usage: omega-stack.bat [components]
REM   components: all, brain, gateway, collective, jarvis
REM   Example: omega-stack.bat gateway,jarvis

setlocal

set COMPONENTS=%1
if "%COMPONENTS%"=="" set COMPONENTS=all

echo.
echo =========================================
echo        OMEGA Stack Launcher
echo =========================================
echo.
echo Starting components: %COMPONENTS%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Start-OMEGAStack.ps1" -Components %COMPONENTS%
