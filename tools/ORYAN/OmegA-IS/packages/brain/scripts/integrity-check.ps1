<#
.SYNOPSIS
    Lightweight integrity check for the RYSE flow.
.DESCRIPTION
    - Collects current session facts (user, machine, cwd, timestamp).
    - Loads the canonical chain template (with placeholders only).
    - Loads the last-session record if it exists.
    - Writes the current-session record and returns a status object.
    - Warns (does not block) if required fields are missing or structure drifts.
    NOTE: No secrets are stored here; initiator/response values remain placeholders.
#>
param(
    [string]$TemplatePath = "$PSScriptRoot/../config/chain-template.json",
    [string]$StateDir = "$PSScriptRoot/../state"
)

$ErrorActionPreference = 'Stop'

function Read-JsonFile {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $null }
    return Get-Content $Path -Raw | ConvertFrom-Json
}

function Write-JsonFile {
    param([string]$Path, [object]$Data)
    $dir = Split-Path $Path
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $Data | ConvertTo-Json -Depth 5 | Set-Content -Path $Path -Encoding UTF8
}

try {
    $template = Read-JsonFile -Path $TemplatePath
    $last = Read-JsonFile -Path (Join-Path $StateDir "last-session.json")

    $now = Get-Date
    $current = [ordered]@{
        user = $env:USERNAME
        machine = $env:COMPUTERNAME
        cwd = Get-Location | Select-Object -ExpandProperty Path
        timestamp = $now.ToString("s")
        initiator_placeholder = $template.initiator_placeholder
        response_placeholder = $template.response_placeholder
        chain_note = "Non-public algorithm will fill real tokens; repo stores placeholders only."
    }

    Write-JsonFile -Path (Join-Path $StateDir "current-session.json") -Data $current

    $issues = @()
    if (-not $template) { $issues += "Missing chain template $TemplatePath" }
    else {
        foreach ($field in @("initiator_placeholder","response_placeholder")) {
            if (-not $template.$field) { $issues += "Template missing required field '$field'" }
        }
    }

    $status = if ($issues.Count -gt 0) { "warn" } else { "ok" }

    $result = [ordered]@{
        Status = $status
        Issues = $issues
        LastSession = $last
        CurrentSession = $current
        TemplatePath = (Resolve-Path -Path $TemplatePath).Path
    }

    Write-JsonFile -Path (Join-Path $StateDir "last-session.json") -Data $current
    return $result
}
catch {
    return [ordered]@{
        Status = "error"
        Issues = @($_.Exception.Message)
        LastSession = $null
        CurrentSession = $null
        TemplatePath = $TemplatePath
    }
}
