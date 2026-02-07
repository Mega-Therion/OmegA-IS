@echo off
:: Grok CLI Wrapper - gAIng Collective
:: Launches Grok agent via PowerShell script
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-grok.ps1" %*
