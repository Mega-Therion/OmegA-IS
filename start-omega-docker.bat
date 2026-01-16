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
echo 🏗️  Building and Starting Services (Brain, HUD, Bridge, Redis)...
docker compose up --build -d

if errorlevel 1 (
    echo.
    echo ❌ Failed to start. Please check Docker status.
) else (
    echo.
    echo ✅ OMEGA is running!
    echo    - Brain: http://localhost:8080
    echo    - HUD:   http://localhost:3000
    echo.
    echo 🔍 View logs with: docker compose logs -f
)
pause
endlocal
