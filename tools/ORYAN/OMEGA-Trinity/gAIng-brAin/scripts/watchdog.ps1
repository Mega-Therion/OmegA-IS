$rootPath = Resolve-Path "$PSScriptRoot\.."
$logPath = Join-Path $rootPath 'log.md'
$notePath = Join-Path $rootPath 'notes\codex-gemini.md'
$geminiScript = Join-Path $rootPath 'scripts\agents-gemini-run.ps1'
$codexScript = Join-Path $rootPath 'scripts\agents-codex-run.ps1'

$lastLogTime = (Get-Item $logPath).LastWriteTime
$lastNoteTime = (Get-Item $notePath).LastWriteTime

Write-Host "Watchdog started. Monitoring $logPath and $notePath every 10s (TURBO MODE)..."

while ($true) {
    Start-Sleep -Seconds 10
    
    $currentLogTime = (Get-Item $logPath).LastWriteTime
    $currentNoteTime = (Get-Item $notePath).LastWriteTime
    
    $runAgents = $false

    if ($currentLogTime -gt $lastLogTime) {
        Write-Host "Change detected in the_log.md at $currentLogTime"
        $lastLogTime = $currentLogTime
        $runAgents = $true
    }

    if ($currentNoteTime -gt $lastNoteTime) {
        Write-Host "Change detected in codex-gemini.md at $currentNoteTime"
        $lastNoteTime = $currentNoteTime
        $runAgents = $true
    }

    if ($runAgents) {
        Write-Host "Triggering Agents..."
        
        # Trigger Gemini (Me)
        Write-Host "Running Gemini..."
        Start-Process -FilePath "powershell" -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File', $geminiScript) -WindowStyle Hidden
        
        # Trigger Codex (Him)
        Write-Host "Running Codex..."
        Start-Process -FilePath "powershell" -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File', $codexScript) -WindowStyle Hidden
    }
}

