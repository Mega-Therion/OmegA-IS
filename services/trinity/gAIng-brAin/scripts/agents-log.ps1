# Logging helpers for agent sessions and shell commands.
# - Human-friendly Markdown log for quick scan.
# - Structured JSONL log for precise replay/rollback tracing.

function Initialize-AgentsLogSession {
    if ($env:AGENTS_LOG_DISABLE -eq '1') { return }
    if ($script:AgentsLogSessionId) { return }

    $script:AgentsLogSessionId = "{0}-pid{1}" -f (Get-Date -Format "yyyyMMddHHmmss"), $PID
    Write-AgentsLog -Message ("session_start cwd={0} user={1} shell={2}" -f (Get-Location), $env:USERNAME, $PSVersionTable.PSEdition) -EventType "session_start" -Cwd (Get-Location)
}

function Write-AgentsLog {
    param(
        [Parameter(Mandatory = $true)][string]$Message,
        [string]$LogPath = $env:AGENTS_MD_PATH,
        [string]$EventType = "command",
        [string]$Cwd = (Get-Location),
        [string]$SessionId = $script:AgentsLogSessionId
    )

    if ($env:AGENTS_LOG_DISABLE -eq '1') { return }
    if ([string]::IsNullOrWhiteSpace($Message)) { return }

    # Default to repo-local shell history (avoid polluting the main protocol log)
    if ([string]::IsNullOrWhiteSpace($LogPath)) {
        $LogPath = Join-Path (Split-Path -Parent $PSScriptRoot) "logs\shell-history.md"
    }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $who = $env:USERNAME
    $session = if ($SessionId) { $SessionId } else { "sess-$PID" }

    # Human-readable trail
    $line = "- {0} [{1}] [{2}] {3}" -f $timestamp, $session, $EventType, $Message
    try {
        $logDir = Split-Path -Parent $LogPath
        if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
        Add-Content -LiteralPath $LogPath -Value $line
    } catch {
    }

    # Structured JSONL trail for replay/grep
    try {
        $eventsDir = Join-Path (Split-Path -Parent $LogPath) "events"
        if (-not (Test-Path $eventsDir)) { New-Item -ItemType Directory -Path $eventsDir -Force | Out-Null }
        $eventFile = Join-Path $eventsDir ("events-{0}.jsonl" -f (Get-Date -Format "yyyyMMdd"))
        $payload = [ordered]@{
            timestamp = $timestamp
            session   = $session
            type      = $EventType
            cwd       = "$Cwd"
            user      = $who
            pid       = $PID
            host      = $env:COMPUTERNAME
            message   = $Message
        } | ConvertTo-Json -Compress
        Add-Content -LiteralPath $eventFile -Value $payload
    } catch {
    }
}

# Emit a session_end marker when the host process exits.
Register-EngineEvent PowerShell.Exiting -Action {
    if ($script:AgentsLogSessionId) {
        Write-AgentsLog -Message "session_end" -EventType "session_end" -SessionId $script:AgentsLogSessionId -Cwd (Get-Location)
    }
} | Out-Null
