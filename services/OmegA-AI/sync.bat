@echo off
:: SYNC.BAT - Memory Sync
title gAIng Brain - SYNC
cd /d "%~dp0"
echo [Brain] Synchronizing memories (Local <-> Supabase)...
npm run sync:two-way
pause
