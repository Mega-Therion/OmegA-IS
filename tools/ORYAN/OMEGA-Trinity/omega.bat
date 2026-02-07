˜@echo off
REM OMEGA Ecosystem Controller
REM ===========================
REM Usage: omega.bat [start|stop|status|test|help]

setlocal

set ACTION=%1
if "%ACTION%"=="" set ACTION=help

echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0OMEGA.ps1" %ACTION%
˜*cascade082Dfile:///c:/Users/mega_/Downloads/OMEGA_REALITY_KIT_UPDATED/omega.bat