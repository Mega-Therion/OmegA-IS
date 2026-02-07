$baseUrl = 'https://sgvitxezqrjgjmduoool.supabase.co'
$serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndml0eGV6cXJqZ2ptZHVvb29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE2MzQ4MCwiZXhwIjoyMDgzNzM5NDgwfQ.o5GjnHg5fivo8MOCfNEv3PJkC0rQhxs2c8dXG7rSoOc'
$bucket = 'gaing-brain-uploads'
$headers = @{ Authorization = "Bearer $serviceKey"; apikey = $serviceKey; 'x-upsert' = 'true' }

function Encode-Path([string]$path) {
  return ($path -split '\\' | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
}

function Sanitize-KeySegment([string]$segment) {
  $seg = $segment -replace '%20', ' '
  $seg = $seg -replace '\.pdf\.pdf$', '.pdf'
  $seg = $seg -replace '\.pdf (\d+)\.pdf$', ' $1.pdf'
  return ($seg -replace '[<>:"/\\|?*]', '_')
}

function Sanitize-ObjectPath([string]$path) {
  return ($path -split '\\' | ForEach-Object { Sanitize-KeySegment $_ }) -join '\\'
}

$logFile = 'C:\Users\mega_\gAIng-Brain\gAIng-brAin\.uploads\upload-folder3.log'
$progressFile = 'C:\Users\mega_\gAIng-Brain\gAIng-brAin\.uploads\upload-folder3.progress.txt'

$folder = Get-ChildItem -Path 'C:\Users\mega_\iCloudDrive' -Recurse -Force -Directory -Filter '*gaing*' -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '[^\x00-\x7F]' } | Select-Object -Skip 3 -First 1
if (-not $folder) { 'No folder found' | Out-File -FilePath $logFile -Append -Encoding ascii; exit }

$index = 0
if (Test-Path $progressFile) {
  $raw = Get-Content $progressFile -ErrorAction SilentlyContinue
  if ($raw) { [int]$index = $raw }
}

$processed = 0
$uploaded = 0
$failed = 0

foreach ($file in [System.IO.Directory]::EnumerateFiles($folder.FullName, '*', [System.IO.SearchOption]::AllDirectories)) {
  if ($processed -lt $index) { $processed++; continue }

  $relative = $file.Substring($folder.FullName.Length).TrimStart('\')
  $objectPath = Join-Path 'gAIng-emoji-3' $relative
  $objectPath = Sanitize-ObjectPath $objectPath
  $encoded = Encode-Path $objectPath
  $uri = "$baseUrl/storage/v1/object/$bucket/$encoded"

  try {
    Invoke-RestMethod -Method Put -Uri $uri -Headers $headers -InFile $file -ContentType 'application/octet-stream' | Out-Null
    $uploaded++
  } catch {
    $failed++
    "FAILED: $objectPath" | Out-File -FilePath $logFile -Append -Encoding ascii
  }

  $processed++
  if (($processed % 50) -eq 0) {
    "Progress: $processed | Uploaded: $uploaded | Failed: $failed" | Out-File -FilePath $logFile -Append -Encoding ascii
    Set-Content -Path $progressFile -Value $processed -Encoding ascii
  }
}

"DONE: Processed=$processed Uploaded=$uploaded Failed=$failed" | Out-File -FilePath $logFile -Append -Encoding ascii
Set-Content -Path $progressFile -Value $processed -Encoding ascii
