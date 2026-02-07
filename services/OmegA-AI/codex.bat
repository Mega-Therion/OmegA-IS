@echo off
:: Codex CLI Wrapper - gAIng Collective
if /I "%1"=="ryse" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-codex.ps1"
) else (
    call codex.cmd %*
)
