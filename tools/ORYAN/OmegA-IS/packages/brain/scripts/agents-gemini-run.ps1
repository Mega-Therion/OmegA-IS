$ErrorActionPreference = "Stop"

# PORTABLE PATH RESOLUTION
$scriptRoot = $PSScriptRoot
$projectRoot = Resolve-Path (Join-Path $scriptRoot "..")

$logPath = $env:AGENTS_MD_PATH
if ([string]::IsNullOrWhiteSpace($logPath)) {
    $logPath = Join-Path $projectRoot "log.md"
}

if (-not (Test-Path -LiteralPath $logPath)) {
    Write-Warning "Log file not found at: $logPath"
    return
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$timestampSlug = Get-Date -Format "yyyyMMdd-HHmmss"

$logsDir = Join-Path $projectRoot "logs"
if (-not (Test-Path -LiteralPath $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}
$runLog = Join-Path $logsDir "gemini-run-$timestampSlug.log"

$prompt = @"
Read and follow instructions from: $logPath
- Only use instructions intended for Gemini.
- If a section named "## Command Queue" exists with lines starting "- cmd:", run those commands in order.
- Append a concise markdown report with timestamp, commands run, results, errors, and next steps to $logPath.
"@

$isArmed = $env:COMMAND_QUEUE_ARMED -eq "true"
if (-not $isArmed) {
    $prompt += "`n- IMPORTANT: Command Queue is DISARMED. Analyize and plan only. Do NOT run commands."
}

$geminiOutput = $null
$exitCode = $null
$start = Get-Date
try {
    # Gemini operates from the project root now
    Set-Location -LiteralPath $projectRoot
    $geminiOutput = & gemini --output-format json --approval-mode yolo $prompt 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
} catch {
    $geminiOutput = "Gemini error: $($_.Exception.Message)"
}
$end = Get-Date

if ([string]::IsNullOrWhiteSpace($geminiOutput)) {
    $geminiOutput = "Gemini produced no output."
}

$logLines = @()
$logLines += "Timestamp: $timestamp"
$logLines += "DurationSeconds: $([Math]::Round(($end - $start).TotalSeconds, 2))"
$logLines += "ExitCode: $exitCode"
$logLines += ""
$logLines += "--- PROMPT ---"
$logLines += $prompt.TrimEnd().Split("`r`n")
$logLines += "--- OUTPUT ---"
$logLines += $geminiOutput.TrimEnd().Split("`r`n")

Set-Content -LiteralPath $runLog -Value $logLines -Encoding Ascii

$appendLines = @()
$appendLines += ""
$appendLines += "## Gemini Run $timestamp"
$appendLines += "- Log: $runLog"
$appendLines += $geminiOutput.TrimEnd().Split("`r`n")

Add-Content -LiteralPath $logPath -Value $appendLines -Encoding Ascii
