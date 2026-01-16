@echo off
echo ===================================================
echo 🛑 Stopping OMEGA Trinity (Docker)
echo ===================================================

"C:\Program Files\Docker\Docker\resources\bin\docker.exe" compose down

echo.
echo ✅ OMEGA services stopped.
pause
