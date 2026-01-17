@echo off
setlocal
echo ===================================================
echo 🚀 Starting OMEGA Trinity (Docker)
echo ===================================================

:: Add Docker to PATH for this session
set "PATH=%PATH%;C:\Program Files\Docker\Docker\resources\bin"

echo Ensuring Docker is running...
docker --version
if errorlevel 1 (
    echo ⚠️  Docker executable not found or not working.
    echo    Please ensure Docker Desktop is installed and running.
    pause
    exit /b
)

echo.
echo 🏗️  Building and Starting Services...
echo    (This may take a few minutes for the first run)
echo.

docker compose up -d --build

if errorlevel 1 (
    echo.
    echo ❌ FAILED TO START.
    echo.
    echo Common Issue: "500 Internal Server Error" / "Pipe error"
    echo SOLUTION: 
    echo   1. Your Docker Desktop / WSL is frozen.
    echo   2. Restart Docker Desktop (Right click Icon - Restart).
    echo   3. If that fails, RESTART YOUR COMPUTER.
    echo.
) else (
    echo.
    echo ✅ OMEGA is running!
    echo.
    echo    🧠 Brain:  http://localhost:8080
    echo    💻 HUD:    http://localhost:3000
    echo.
    echo 🔍 View logs with: docker compose logs -f
)
pause
endlocal
