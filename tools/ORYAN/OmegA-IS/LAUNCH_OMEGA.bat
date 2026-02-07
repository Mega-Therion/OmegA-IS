Ñ@echo off
TITLE OMEGA TRINITY LAUNCHER
COLOR 0A
CLS

echo ===============================================================================
echo   THE OMEGA TRINITY - ACTIVATION SEQUENCE
echo   (Brain + Bridge + HUD)
echo ===============================================================================
echo.

:: 1. Start gAIng Brain (Backend Memory)
echo [1/3] Igniting gAIng Brain (Port 8080)...
start "OMEGA BRAIN" /min cmd /k "cd /d c:\Users\mega_\Downloads\OMEGA_REALITY_KIT_UPDATED\gAIng-brAin && npm start"

:: 2. Start OMEGA Bridge (OxySpine - Python FastAPI)
echo [2/3] Firing Synapses - OxySpine Bridge (Port 8010)...
start "OMEGA BRIDGE" /min cmd /k "cd /d C:\OMEGA\omega-hud\apps\bridge && venv\Scripts\activate && uvicorn main:app --port 8010 --reload"

:: 3. Start OMEGA HUD (Frontend - Next.js)
echo [3/3] Opening Council Chamber - HUD (Port 3000)...
start "OMEGA HUD" /min cmd /k "cd /d C:\OMEGA\omega-hud\apps\web && npm run dev"

echo.
echo ===============================================================================
echo   ALL SYSTEMS GO.
echo.
echo   - Brain:  http://localhost:8080
echo   - Bridge: http://localhost:8010
echo   - HUD:    http://localhost:3000/council
echo.
echo   Press any key to kill all processes and shutdown...
echo ===============================================================================
pause >nul

:: Kill sequence
taskkill /F /IM node.exe
taskkill /F /IM python.exe
echo System Shutdown.
pause
Ñ*cascade082Kfile:///c:/Users/mega_/Downloads/OMEGA_REALITY_KIT_UPDATED/LAUNCH_OMEGA.bat