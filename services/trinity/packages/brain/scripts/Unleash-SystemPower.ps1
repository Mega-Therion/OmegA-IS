# Unleash-SystemPower.ps1
# Full System Enablement for gAIng Collective Autonomous Operation

Write-Host "=====================================================" -ForegroundColor Magenta
Write-Host "       UNLEASHING FULL SYSTEM POWER (Peak Mode v2)   " -ForegroundColor Magenta
Write-Host "=====================================================" -ForegroundColor Magenta

# 1. ADMIN CHECK
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script MUST be run as Administrator."
    exit
}

# 2. ENABLE DEVELOPER MODE
Write-Host "[1/7] Enabling Windows Developer Mode..."
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" -Name "AllowDevelopmentWithoutDevLicense" -Value 1 -ErrorAction SilentlyContinue

# 3. ENABLE LONG PATHS (Critical for Agent Depth)
Write-Host "[2/7] Enabling Long Paths support..."
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1

# 4. UNRESTRICTED POWERSHELL (Global Bypass)
Write-Host "[3/7] Setting Global Execution Policy to Bypass..."
Set-ExecutionPolicy Bypass -Scope LocalMachine -Force

# 5. ENABLE VIRTUALIZATION & SANDBOXING
Write-Host "[4/7] Enabling WSL, Virtual Machine Platform, and Windows Sandbox..."
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
dism.exe /online /enable-feature /featurename:Containers-DisposableKit /all /norestart # Windows Sandbox

# 6. UNLOCK ULTIMATE PERFORMANCE MODE
Write-Host "[5/7] Activating Ultimate Performance Power Plan..."
# Restore the Ultimate Performance scheme if it's hidden
powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 | Out-Null
$scheme = powercfg /list | Select-String "Ultimate Performance" | ForEach-Object { $_.ToString().Split()[3] }
if ($scheme) { powercfg /setactive $scheme }

# 7. REMOVE UI LAG (Optimize for Agent Speed)
Write-Host "[6/7] Stripping UI Lag (Visual Performance Mode)..."
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" -Name "VisualFXSetting" -Value 2
Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "UserPreferencesMask" -Value ([byte[]](0x90,0x12,0x03,0x80,0x10,0x00,0x00,0x00))

# 8. PERMANENT PATH INJECTION
Write-Host "[7/7] Injecting Project Paths into Global PATH..."
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$newPaths = "(Split-Path -Parent $PSScriptRoot);(Split-Path -Parent $PSScriptRoot)\scripts"
foreach ($p in $newPaths.Split(';')) {
    if ($currentPath -notlike "*$p*") { $currentPath += ";$p" }
}
[Environment]::SetEnvironmentVariable("Path", $currentPath, "Machine")

Write-Host "`n=====================================================" -ForegroundColor Green
Write-Host "       SYSTEM FULLY UNLOCKED. READY FOR COMMANDS.    " -ForegroundColor Green
Write-Host "       *Note: Some features require a REBOOT.*       " -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green

