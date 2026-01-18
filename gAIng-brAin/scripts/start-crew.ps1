# gAIng Crew Launcher
# Starts all AI agent CLIs in separate terminal windows

param(
    [switch]$Claude,
    [switch]$Codex,
    [switch]$Gemini,
    [switch]$Grok,
    [switch]$All
)

$ScriptRoot = $PSScriptRoot

# Load environment from .env
$envFile = "$ScriptRoot\..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
        }
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       gAIng CREW LAUNCHER              " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check CLI availability
$agents = @{
    'Claude' = @{ cmd = 'claude'; script = 'start-claude.ps1'; installed = $false }
    'Codex'  = @{ cmd = 'codex'; script = 'start-codex.ps1'; installed = $false }
    'Gemini' = @{ cmd = 'gemini'; script = 'start-gemini.ps1'; installed = $false }
    'Grok'   = @{ cmd = 'grok'; script = 'start-grok.ps1'; installed = $false }
}

foreach ($name in $agents.Keys) {
    $agent = $agents[$name]
    if (Get-Command $agent.cmd -ErrorAction SilentlyContinue) {
        $agent.installed = $true
        Write-Host "  [OK] $name CLI installed" -ForegroundColor Green
    } else {
        Write-Host "  [--] $name CLI not found" -ForegroundColor Yellow
    }
}

Write-Host ""

# Determine which agents to launch
$toLaunch = @()
if ($All) {
    $toLaunch = @('Claude', 'Codex', 'Gemini', 'Grok')
} else {
    if ($Claude) { $toLaunch += 'Claude' }
    if ($Codex) { $toLaunch += 'Codex' }
    if ($Gemini) { $toLaunch += 'Gemini' }
    if ($Grok) { $toLaunch += 'Grok' }
}

# If no flags specified, show usage
if ($toLaunch.Count -eq 0) {
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\start-crew.ps1 -All           # Launch all agents"
    Write-Host "  .\start-crew.ps1 -Claude        # Launch Claude only"
    Write-Host "  .\start-crew.ps1 -Codex -Gemini # Launch specific agents"
    Write-Host ""
    Write-Host "Available agents: Claude, Codex, Gemini, Grok" -ForegroundColor Gray
    exit 0
}

# Launch selected agents
Write-Host "Launching agents: $($toLaunch -join ', ')" -ForegroundColor Cyan
Write-Host ""

foreach ($name in $toLaunch) {
    $agent = $agents[$name]
    if (-not $agent.installed) {
        Write-Host "  [SKIP] $name - CLI not installed" -ForegroundColor Yellow
        continue
    }

    $script = Join-Path $ScriptRoot $agent.script
    if (Test-Path $script) {
        Write-Host "  [LAUNCH] $name..." -ForegroundColor Green
        Start-Process -FilePath "pwsh" -ArgumentList "-NoExit", "-File", $script -WindowStyle Normal
        Start-Sleep -Milliseconds 500
    } else {
        Write-Host "  [ERROR] $name - Script not found: $script" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Crew deployed. Check individual      " -ForegroundColor Cyan
Write-Host "  terminal windows for each agent.     " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
