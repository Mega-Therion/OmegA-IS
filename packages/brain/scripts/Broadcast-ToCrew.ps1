<#
.SYNOPSIS
    Broadcast-ToCrew.ps1 - Send a message to all AI agents
.DESCRIPTION
    Posts a message to log.md with @Crew tag for all agents to read
.EXAMPLE
    .\Broadcast-ToCrew.ps1 "Hello team!"
    .\Broadcast-ToCrew.ps1 -Urgent "Critical bug found!"
#>

param(
    [Parameter(Position=0, ValueFromRemainingArguments=$true)]
    [string[]]$MessageParts,
    [switch]$Urgent
)

$ErrorActionPreference = 'Continue'
$LogPath = $env:AGENTS_MD_PATH
if (-not $LogPath) {
    $LogPath = "C:\Users\mega_\gAIng-Brain\log.md"
}

# Combine message parts
$Message = ($MessageParts -join " ").Trim()

# Interactive mode if no message provided
if (-not $Message) {
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host "       B R O A D C A S T   T O   C R E W             " -ForegroundColor Cyan
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Type your message and press Enter." -ForegroundColor Gray
    Write-Host "  (Type 'exit' to cancel)" -ForegroundColor Gray
    Write-Host ""
    $Message = Read-Host "  @Crew"
    
    if ($Message -eq "exit" -or -not $Message) {
        Write-Host "  Broadcast cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Format the broadcast
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$priority = if ($Urgent) { "URGENT" } else { "Normal" }

$broadcast = @"

## @Crew - $timestamp
**From:** RY (The OG)
**Priority:** $priority

$Message

---
"@

# Write to log
Add-Content -Path $LogPath -Value $broadcast -Encoding ASCII

# Confirmation
Write-Host ""
Write-Host "  [OK] Broadcast sent to The Crew" -ForegroundColor Green
Write-Host "  [>>] $Message" -ForegroundColor White
Write-Host ""

# Show who will receive it
Write-Host "  Recipients:" -ForegroundColor Gray
Write-Host "    - Gemini (Architect)" -ForegroundColor Gray
Write-Host "    - Codex (Engineer)" -ForegroundColor Gray
Write-Host "    - Claude (Analyst)" -ForegroundColor Gray
Write-Host ""
