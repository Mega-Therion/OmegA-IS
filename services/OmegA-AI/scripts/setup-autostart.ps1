<#
.SYNOPSIS
    Setup Auto-Launch for DAWN Protocol
.DESCRIPTION
    Configures Windows to automatically launch DAWN.bat on login
#>

#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Setting up DAWN Protocol Auto-Launch..." -ForegroundColor Cyan
Write-Host ""

# 1. Create shortcut in Startup folder
$StartupFolder = [System.Environment]::GetFolderPath('Startup')
$ShortcutPath = Join-Path $StartupFolder "gAIng-DAWN.lnk"
$TargetPath = Join-Path $ProjectRoot "DAWN.bat"

$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.Description = "gAIng Collective DAWN Protocol - Multi-Agent Startup"
$Shortcut.IconLocation = "powershell.exe,0"
$Shortcut.Save()

Write-Host "[OK] Created startup shortcut: $ShortcutPath" -ForegroundColor Green

# 2. Create Windows Terminal profile (optional)
$wtSettingsPath = "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"

if (Test-Path $wtSettingsPath) {
    Write-Host "[INFO] Windows Terminal detected" -ForegroundColor Yellow
    Write-Host "       To customize your terminal profile:" -ForegroundColor Gray
    Write-Host "       1. Open Windows Terminal Settings" -ForegroundColor Gray
    Write-Host "       2. Add a new profile" -ForegroundColor Gray
    Write-Host "       3. Command line: $TargetPath" -ForegroundColor Gray
    Write-Host "       4. Set as default if desired" -ForegroundColor Gray
} else {
    Write-Host "[INFO] Windows Terminal not found (using default terminal)" -ForegroundColor Yellow
}

# 3. Create Task Scheduler entry (alternative method)
Write-Host ""
Write-Host "Creating Task Scheduler entry..." -ForegroundColor Cyan

$TaskName = "gAIng-DAWN-Startup"
$TaskDescription = "Starts gAIng Collective multi-agent system on login"

# Remove existing task if present
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$Action = New-ScheduledTaskAction -Execute $TargetPath -WorkingDirectory $ProjectRoot
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$Principal = New-ScheduledTaskPrincipal -UserID $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Description $TaskDescription -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal | Out-Null

Write-Host "[OK] Task Scheduler entry created: $TaskName" -ForegroundColor Green

# 4. Summary
Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "   AUTO-START CONFIGURED" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Method 1: Startup Folder" -ForegroundColor White
Write-Host "    Location: $ShortcutPath" -ForegroundColor Gray
Write-Host ""
Write-Host "  Method 2: Task Scheduler" -ForegroundColor White
Write-Host "    Task: $TaskName" -ForegroundColor Gray
Write-Host ""
Write-Host "  The DAWN Protocol will automatically run on your next login." -ForegroundColor Yellow
Write-Host ""
Write-Host "  To disable: Delete the shortcut or disable the scheduled task." -ForegroundColor Gray
Write-Host ""

Write-Host "Press Enter to continue..."
Read-Host
