param(
  [string]$LogPath = "C:\WINDOWS\system32\the_log.md",
  [string]$NotesPath = "(Split-Path -Parent $PSScriptRoot)\notes\codex-gemini.md",
  [string]$FeedPath = "(Split-Path -Parent $PSScriptRoot)\notes\codex-gemini-feed.md",
  [string]$StatePath = "(Split-Path -Parent $PSScriptRoot)\notes\.poll-state.json"
)

function Load-State {
  if (-not (Test-Path -LiteralPath $StatePath)) {
    return @{ }
  }
  try {
    $raw = Get-Content -LiteralPath $StatePath -Raw -ErrorAction Stop
    return (ConvertFrom-Json -InputObject $raw -ErrorAction Stop)
  } catch {
    return @{ }
  }
}

function Save-State($state) {
  $state | ConvertTo-Json | Set-Content -LiteralPath $StatePath
}

function Append-Updates {
  param(
    [string]$Path,
    [string]$Label,
    [hashtable]$State
  )
  if (-not (Test-Path -LiteralPath $Path)) { return }

  $lines = Get-Content -LiteralPath $Path
  $currentCount = $lines.Count
  $stateKey = $Label.Replace(' ', '_')
  $lastCount = 0
  if ($State.ContainsKey($stateKey)) {
    $lastCount = [int]$State[$stateKey]
  }

  if ($currentCount -lt $lastCount) {
    $lastCount = 0
  }

  if ($currentCount -gt $lastCount) {
    $newLines = $lines[$lastCount..($currentCount - 1)]
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $payload = @(
      "",
      "## $stamp $Label",
      $newLines
    )
    Add-Content -LiteralPath $FeedPath -Value $payload
  }

  $State[$stateKey] = $currentCount
}

$state = @{}
$loaded = Load-State
foreach ($key in $loaded.PSObject.Properties.Name) {
  $state[$key] = $loaded.$key
}

Append-Updates -Path $LogPath -Label "the_log.md updates" -State $state
Append-Updates -Path $NotesPath -Label "codex-gemini.md updates" -State $state

Save-State $state

