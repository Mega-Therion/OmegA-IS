@echo off
:: Claude CLI Wrapper - gAIng Collective
if /I "%1"=="ryse" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-claude.ps1"
) else (
    call claude.cmd %*
)
