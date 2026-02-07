@echo off
:: RYSE - Master Switch for DAWN Protocol (Gemini + Codex + Claude)
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0DAWN.ps1" %*

endlocal
