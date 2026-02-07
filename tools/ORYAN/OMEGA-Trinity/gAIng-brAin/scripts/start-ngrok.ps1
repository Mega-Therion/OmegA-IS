param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [int]$Port = 8080
)

Set-Location $ProjectRoot

$logDir = Join-Path $ProjectRoot 'logs'
New-Item -Path $logDir -ItemType Directory -Force | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDir "ngrok-$timestamp.startup.log"

function Write-Log {
  param([string]$Message)
  Add-Content -Path $logPath -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}

$userEnable = [Environment]::GetEnvironmentVariable('ENABLE_NGROK', 'User')
$userToken = [Environment]::GetEnvironmentVariable('NGROK_AUTHTOKEN', 'User')
$systemEnable = [Environment]::GetEnvironmentVariable('ENABLE_NGROK', 'Machine')
$systemToken = [Environment]::GetEnvironmentVariable('NGROK_AUTHTOKEN', 'Machine')

if (-not $env:ENABLE_NGROK -and $userEnable) {
  $env:ENABLE_NGROK = $userEnable
}
if (-not $env:ENABLE_NGROK -and $systemEnable) {
  $env:ENABLE_NGROK = $systemEnable
}
if (-not $env:NGROK_AUTHTOKEN -and $userToken) {
  $env:NGROK_AUTHTOKEN = $userToken
}
if (-not $env:NGROK_AUTHTOKEN -and $systemToken) {
  $env:NGROK_AUTHTOKEN = $systemToken
}

if ($env:ENABLE_NGROK -ne '1') {
  Write-Log "ENABLE_NGROK is not set to 1 (User=$userEnable, System=$systemEnable); skipping ngrok."
  exit 0
}

if (-not $env:NGROK_AUTHTOKEN) {
  Write-Log "NGROK_AUTHTOKEN is not set (UserPresent=$([bool]$userToken), SystemPresent=$([bool]$systemToken)); skipping ngrok."
  exit 0
}

$ngrokCmd = (Get-Command "ngrok.exe" -ErrorAction SilentlyContinue).Source
if (-not $ngrokCmd) {
  $candidate = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\ngrok.exe'
  if (Test-Path -LiteralPath $candidate) {
    $ngrokCmd = $candidate
  }
}

if (-not $ngrokCmd) {
  Write-Log 'ngrok.exe not found on PATH; skipping ngrok.'
  exit 0
}

Write-Log "Starting ngrok from $ngrokCmd on port $Port"

$outPath = Join-Path $logDir "ngrok-$timestamp.out.log"
$errPath = Join-Path $logDir "ngrok-$timestamp.err.log"

Start-Process -FilePath $ngrokCmd -ArgumentList "http $Port" -WorkingDirectory $ProjectRoot -WindowStyle Hidden -RedirectStandardOutput $outPath -RedirectStandardError $errPath

