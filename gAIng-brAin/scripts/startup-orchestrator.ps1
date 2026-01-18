param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [int]$Port = 8080
)

$startBrain = Join-Path $ProjectRoot 'scripts\start-brain.ps1'
$startNgrok = Join-Path $ProjectRoot 'scripts\start-ngrok.ps1'
$healthScript = Join-Path $ProjectRoot 'scripts\health-check.js'
$codexScript = Join-Path $ProjectRoot 'scripts\start-codex.ps1'
$geminiScript = Join-Path $ProjectRoot 'scripts\start-gemini.ps1'

$logDir = Join-Path $ProjectRoot 'logs'
if (!(Test-Path $logDir)) { New-Item -Path $logDir -ItemType Directory -Force | Out-Null }
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDir "startup-orchestrator-$timestamp.log"

function Write-Log {
  param([string]$Message)
  $msg = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Write-Host $msg
  Add-Content -Path $logPath -Value $msg
}

Write-Log "Starting gAIng-Brain Orchestrator..."

if (Test-Path -LiteralPath $startBrain) {
  Write-Log "Starting brain via $startBrain"
  Start-Process -FilePath "PowerShell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$startBrain`"" -WorkingDirectory $ProjectRoot -WindowStyle Minimized
} else {
  Write-Log "Missing start-brain.ps1 at $startBrain"
}

Start-Sleep -Seconds 5

# Note: ngrok is now handled internally by the brain (index.js) if ENABLE_NGROK=1
Write-Log "Ngrok start skipped (handled by brain internally)."

Start-Sleep -Seconds 5

if (Test-Path -LiteralPath $healthScript) {
  Write-Log "Running health check via $healthScript"
  try {
    Push-Location $ProjectRoot
    node $healthScript
    Write-Log "Health check completed"
  } catch {
    Write-Log "Health check failed: $($_.Exception.Message)"
  } finally {
    Pop-Location
  }
} else {
  Write-Log "Missing health-check.js at $healthScript"
}

if (Test-Path -LiteralPath $codexScript) {
  Write-Log "Launching Codex via $codexScript"
  Start-Process -FilePath "PowerShell.exe" -ArgumentList "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$codexScript`"" -WorkingDirectory $ProjectRoot
} else {
  Write-Log "Missing start-codex.ps1 at $codexScript"
}

if (Test-Path -LiteralPath $geminiScript) {
  Write-Log "Launching Gemini via $geminiScript"
  Start-Process -FilePath "PowerShell.exe" -ArgumentList "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$geminiScript`"" -WorkingDirectory $ProjectRoot
} else {
  Write-Log "Missing start-gemini.ps1 at $geminiScript"
}
