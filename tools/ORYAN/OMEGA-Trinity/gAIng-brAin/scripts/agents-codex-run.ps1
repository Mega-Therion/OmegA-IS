$ErrorActionPreference = "Stop"

# PORTABLE PATH RESOLUTION
$scriptRoot = $PSScriptRoot
$projectRoot = Resolve-Path (Join-Path $scriptRoot "..")

$logPath = $env:AGENTS_MD_PATH
if ([string]::IsNullOrWhiteSpace($logPath)) {
    $logPath = Join-Path $projectRoot "log.md"
}

if (-not (Test-Path -LiteralPath $logPath)) {
    return
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$timestampSlug = Get-Date -Format "yyyyMMdd-HHmmss"

$logsDir = Join-Path $projectRoot "logs"
if (-not (Test-Path -LiteralPath $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}
$runLog = Join-Path $logsDir "codex-run-$timestampSlug.log"

$prompt = @"
Read and follow instructions from: $logPath
- Only use instructions intended for Codex.
- If a section named "## Command Queue" exists with lines starting "- cmd:", run those commands in order.
- Append a concise markdown report with timestamp, commands run, results, errors, and next steps to $logPath.
"@

$isArmed = $env:COMMAND_QUEUE_ARMED -eq "true"
if (-not $isArmed) {
    $prompt += "`n- IMPORTANT: Command Queue is DISARMED. Analyize and plan only. Do NOT run commands."
}

$codexOutput = $null
$exitCode = $null
$start = Get-Date
try {
    # Codex operates from the project root now
    Set-Location -LiteralPath $projectRoot
    $codexOutput = $prompt | & codex exec -C $projectRoot - 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
} catch {
    $codexOutput = "Codex error: $($_.Exception.Message)"
}
$end = Get-Date

if ([string]::IsNullOrWhiteSpace($codexOutput)) {
    $codexOutput = "Codex produced no output."
}

$logLines = @()
$logLines += "Timestamp: $timestamp"
$logLines += "DurationSeconds: $([Math]::Round(($end - $start).TotalSeconds, 2))"
$logLines += "ExitCode: $exitCode"
$logLines += ""
$logLines += "--- PROMPT ---"
$logLines += $prompt.TrimEnd().Split("`r`n")
$logLines += "--- OUTPUT ---"
$logLines += $codexOutput.TrimEnd().Split("`r`n")

Set-Content -LiteralPath $runLog -Value $logLines -Encoding Ascii

$appendLines = @()
$appendLines += ""
$appendLines += "## Codex Run $timestamp"
$appendLines += "- Log: $runLog"
$appendLines += $codexOutput.TrimEnd().Split("`r`n")

Add-Content -LiteralPath $logPath -Value $appendLines -Encoding Ascii
