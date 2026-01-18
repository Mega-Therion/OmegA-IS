param(
  [switch]$NoDoctor,
  [int]$BackendPort = 8080,
  [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"

function Test-Port {
  param([int]$Port)
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $ok = $async.AsyncWaitHandle.WaitOne(300)
    $client.Close()
    return $ok
  } catch { return $false }
}

Write-Host "OMEGA START ⚡️" -ForegroundColor Cyan
Write-Host ("Node: " + (node -v))

if (-not $NoDoctor) {
  Write-Host "Running omega:doctor..." -ForegroundColor DarkCyan
  npm run omega:doctor
  if ($LASTEXITCODE -ne 0) { throw "omega:doctor failed. Fix issues above first." }
}

if (Test-Port -Port $BackendPort) {
  Write-Host "Port $BackendPort already in use (backend). Stop what's running or change port." -ForegroundColor Yellow
}
if (Test-Port -Port $FrontendPort) {
  Write-Host "Port $FrontendPort already in use (frontend). Stop what's running or change port." -ForegroundColor Yellow
}

Write-Host "Starting backend..." -ForegroundColor Green
$backend = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru -NoNewWindow

Start-Sleep -Seconds 1

if (Test-Path ".\frontend\package.json") {
  Write-Host "Starting frontend..." -ForegroundColor Green
  $frontend = Start-Process -FilePath "npm" -ArgumentList "run","frontend" -PassThru -NoNewWindow
} else {
  Write-Host "frontend/ not found. Run: npm run omega:setup" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Frontend: http://localhost:$FrontendPort" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:$BackendPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both." -ForegroundColor DarkGray

try {
  while ($true) {
    Start-Sleep -Seconds 1
    if ($backend.HasExited) { throw "Backend exited with code $($backend.ExitCode)" }
    if ($frontend -and $frontend.HasExited) { throw "Frontend exited with code $($frontend.ExitCode)" }
  }
} finally {
  Write-Host "Stopping..." -ForegroundColor Yellow
  if ($frontend -and -not $frontend.HasExited) { Stop-Process -Id $frontend.Id -Force }
  if (-not $backend.HasExited) { Stop-Process -Id $backend.Id -Force }
}
