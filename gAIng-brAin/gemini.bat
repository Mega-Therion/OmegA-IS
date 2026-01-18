@echo off
:: Gemini CLI Wrapper - gAIng Collective
if /I "%1"=="ryse" (
    call "%~dp0ryse.bat"
) else (
    call gemini.cmd %*
)
