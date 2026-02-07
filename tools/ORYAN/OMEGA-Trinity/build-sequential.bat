@echo off
echo 🏗️  Building OMEGA Services sequentially to improve stability...

echo.
echo [1/3] Building Brain...
"C:\Program Files\Docker\Docker\resources\bin\docker.exe" compose build omega-brain
if %ERRORLEVEL% NEQ 0 goto :error

echo.
echo [2/3] Building HUD...
"C:\Program Files\Docker\Docker\resources\bin\docker.exe" compose build omega-hud
if %ERRORLEVEL% NEQ 0 goto :error

echo.
echo [3/3] Building Bridge...
"C:\Program Files\Docker\Docker\resources\bin\docker.exe" compose build omega-bridge
if %ERRORLEVEL% NEQ 0 goto :error

echo.
echo ✅ Build complete! Starting services...
"C:\Program Files\Docker\Docker\resources\bin\docker.exe" compose up -d
goto :eof

:error
echo.
echo ❌ Build failed. Please check the logs above.
pause
