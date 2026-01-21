@echo off
echo ========================================
echo gAIng-brAin Supabase Setup - Final Step
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Testing Supabase connection...
node scripts/test-connection.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ Connection failed. Please check:
    echo    1. Did you add the service_role key to .env?
    echo    2. Open: FINISH_SETUP.md for instructions
    echo.
    pause
    exit /b 1
)

echo.
echo [2/3] Creating storage bucket...
node scripts/setup-storage-bucket.js
if %errorlevel% neq 0 (
    echo ❌ Bucket creation failed
    pause
    exit /b 1
)

echo.
echo [3/3] Syncing all files to Supabase...
node scripts/sync-files-to-supabase.js
if %errorlevel% neq 0 (
    echo ❌ File sync failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ SETUP COMPLETE!
echo ========================================
echo.
echo All your gAIng-brAin files are now synced to Supabase!
echo.
echo Next steps:
echo   - View files: https://supabase.com/dashboard/project/sgvitxezqrjgjmduoool/storage/buckets
echo   - Query database: https://supabase.com/dashboard/project/sgvitxezqrjgjmduoool/editor
echo.
pause
