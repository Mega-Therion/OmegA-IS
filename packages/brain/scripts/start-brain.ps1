param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)
$ngrokRunning = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
$originalEnable = $env:ENABLE_NGROK
if ($ngrokRunning) {
  $env:ENABLE_NGROK = "0"
}

Start-Process -FilePath "node" -ArgumentList "index.js" -WorkingDirectory $ProjectRoot -WindowStyle Minimized

if ($ngrokRunning) {
  $env:ENABLE_NGROK = $originalEnable
}

