<#
.SYNOPSIS
  Provides initiator/response keys for the crew startup flows.
.DESCRIPTION
  - Pulls values from env vars GAING_INIT_KEY and GAING_RESPONSE_KEY.
  - Falls back to placeholders if env vars are unset (no secrets in repo).
  - Returns an object with the keys and flags indicating placeholder use.
#>

$init = $env:GAING_INIT_KEY
$resp = [Environment]::GetEnvironmentVariable("GAING_RESPONSE_KEY", 'Process')


$initPlaceholder = "<<INITIATOR_KEY_PLACEHOLDER>>"
$respPlaceholder = "<<RESPONSE_KEY_PLACEHOLDER>>"

$initIsPlaceholder = $false
$respIsPlaceholder = $false

if ([string]::IsNullOrWhiteSpace($init)) {
    $init = $initPlaceholder
    $initIsPlaceholder = $true
}

if ([string]::IsNullOrWhiteSpace($resp)) {
    $resp = $respPlaceholder
    $respIsPlaceholder = $true
}

[pscustomobject]@{
    Initiator = $init
    Response = $resp
    InitiatorIsPlaceholder = $initIsPlaceholder
    ResponseIsPlaceholder = $respIsPlaceholder
}
