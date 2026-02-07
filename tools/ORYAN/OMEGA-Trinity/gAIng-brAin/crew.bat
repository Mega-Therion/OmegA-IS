@echo off
:: =====================================================
::   CREW.BAT - Broadcast to All AI Agents
::   Usage: crew "Your message here"
::          crew (interactive mode)
:: =====================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\mega_\gAIng-Brain\scripts\Broadcast-ToCrew.ps1" %*
