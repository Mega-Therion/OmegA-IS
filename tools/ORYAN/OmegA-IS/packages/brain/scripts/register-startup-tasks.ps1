param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [switch]$EnableNgrokTask,
  [switch]$UseLegacyStartTask
)

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

$startScript = Join-Path $ProjectRoot 'scripts\start-brain.ps1'
$syncScript = Join-Path $ProjectRoot 'scripts\sync-archive.ps1'
$twoWayScript = Join-Path $ProjectRoot 'scripts\sync-two-way.ps1'
$ngrokScript = Join-Path $ProjectRoot 'scripts\start-ngrok.ps1'
$orchestratorScript = Join-Path $ProjectRoot 'scripts\startup-orchestrator.ps1'

if ($UseLegacyStartTask) {
  $startAction = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`""
  $startTrigger = New-ScheduledTaskTrigger -AtLogOn
  Register-ScheduledTask -TaskName 'gAIngBrain-Start' -Action $startAction -Trigger $startTrigger -Principal $principal -Settings $settings -Description 'Start gAIng-Brain API server at logon.' -Force
} else {
  Unregister-ScheduledTask -TaskName 'gAIngBrain-Start' -Confirm:$false -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName 'gAIngBrain-Ngrok' -Confirm:$false -ErrorAction SilentlyContinue
  $orchestratorAction = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$orchestratorScript`""
  $orchestratorTrigger = New-ScheduledTaskTrigger -AtLogOn
  Register-ScheduledTask -TaskName 'gAIngBrain-StartupFull' -Action $orchestratorAction -Trigger $orchestratorTrigger -Principal $principal -Settings $settings -Description 'Start gAIng-Brain, ngrok, health check, then open Codex and Gemini at logon.' -Force
  if ($EnableNgrokTask) {
    Write-Host 'Note: EnableNgrokTask is ignored when using startup orchestrator.'
  }
}

$syncAction = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$syncScript`""
$syncTrigger = New-ScheduledTaskTrigger -AtLogOn
$syncTrigger.Delay = 'PT2M'
Register-ScheduledTask -TaskName 'gAIngBrain-Sync' -Action $syncAction -Trigger $syncTrigger -Principal $principal -Settings $settings -Description 'Export Supabase data to local archive at logon.' -Force

$twoWayAction = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$twoWayScript`""
$twoWayTrigger = New-ScheduledTaskTrigger -AtLogOn
$twoWayTrigger.Delay = 'PT3M'
Register-ScheduledTask -TaskName 'gAIngBrain-TwoWaySync' -Action $twoWayAction -Trigger $twoWayTrigger -Principal $principal -Settings $settings -Description 'Two-way sync Supabase and local DB at logon.' -Force

if ($EnableNgrokTask -and $UseLegacyStartTask) {
  $ngrokAction = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ngrokScript`""
  $ngrokTrigger = New-ScheduledTaskTrigger -AtLogOn
  $ngrokTrigger.Delay = 'PT1M'
  Register-ScheduledTask -TaskName 'gAIngBrain-Ngrok' -Action $ngrokAction -Trigger $ngrokTrigger -Principal $principal -Settings $settings -Description 'Start ngrok tunnel at logon.' -Force
} else {
  Write-Host 'Ngrok task not registered. Enable with -EnableNgrokTask if desired.'
}

