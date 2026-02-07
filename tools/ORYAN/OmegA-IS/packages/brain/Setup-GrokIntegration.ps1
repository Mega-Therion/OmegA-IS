<#
.SYNOPSIS
    Automates the setup of Grok (xAI) integration for CLI and Visual Studio Code.

.DESCRIPTION
    This idempotent PowerShell script sets up Grok integration by:
    - Setting the XAI_API_KEY environment variable
    - Installing the Grok CLI tool (@vibe-kit/grok-cli)
    - Installing VS Code extensions for Grok
    - Configuring VS Code settings with API key and model preferences

.PARAMETER XaiApiKey
    Mandatory. The xAI API Key for Grok integration (provided as a secure string).

.PARAMETER GrokModel
    Optional. The Grok model to use in VS Code. Default: "grok-code-fast-1"

.EXAMPLE
    $apiKey = Read-Host -AsSecureString -Prompt "Enter your xAI API Key"
    .\Setup-GrokIntegration.ps1 -XaiApiKey $apiKey

.EXAMPLE
    $apiKey = Read-Host -AsSecureString -Prompt "Enter your xAI API Key"
    .\Setup-GrokIntegration.ps1 -XaiApiKey $apiKey -GrokModel "grok-code-fast-1"

.NOTES
    Author: gAIng-brAin Automation
    Version: 1.0
    Requires: PowerShell 5.1 or higher
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "Enter your xAI API Key")]
    [SecureString]$XaiApiKey,

    [Parameter(Mandatory = $false)]
    [string]$GrokModel = "grok-code-fast-1"
)

# Set strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Helper function to convert SecureString to plain text
function ConvertFrom-SecureStringToPlainText {
    param([SecureString]$SecureString)

    try {
        $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
        return [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    }
    finally {
        if ($bstr -ne [IntPtr]::Zero) {
            [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }
}

# Helper function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )

    switch ($Type) {
        "Success" { Write-Host "✓ $Message" -ForegroundColor Green }
        "Warning" { Write-Host "⚠ $Message" -ForegroundColor Yellow }
        "Error"   { Write-Host "✗ $Message" -ForegroundColor Red }
        "Info"    { Write-Host "ℹ $Message" -ForegroundColor Cyan }
        default   { Write-Host $Message }
    }
}

# Display script header
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  Grok (xAI) Integration Setup Script" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Convert secure string to plain text for system operations
$XaiApiKey_PlainText = ConvertFrom-SecureStringToPlainText -SecureString $XaiApiKey

#region CLI Setup - Environment Variables

Write-ColorOutput "Setting up CLI environment variables..." "Info"

try {
    # Set persistent environment variable for current user
    [Environment]::SetEnvironmentVariable("XAI_API_KEY", $XaiApiKey_PlainText, "User")
    Write-ColorOutput "Successfully set XAI_API_KEY environment variable (User scope - Persistent)" "Success"

    # Set environment variable for current session
    $env:XAI_API_KEY = $XaiApiKey_PlainText
    Write-ColorOutput "Successfully set XAI_API_KEY environment variable (Current session)" "Success"
}
catch {
    Write-ColorOutput "Failed to set environment variables: $_" "Error"
    throw
}

#endregion

#region CLI Setup - Grok CLI Tool Installation

Write-ColorOutput "`nInstalling Grok CLI tool..." "Info"

# Check for package managers (prioritize bun)
$bunAvailable = $null -ne (Get-Command "bun" -ErrorAction SilentlyContinue)
$npmAvailable = $null -ne (Get-Command "npm" -ErrorAction SilentlyContinue)

if ($bunAvailable) {
    try {
        Write-ColorOutput "Found 'bun' package manager. Installing @vibe-kit/grok-cli..." "Info"
        $bunOutput = bun add -g @vibe-kit/grok-cli 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Successfully installed @vibe-kit/grok-cli using bun" "Success"
        }
        else {
            Write-ColorOutput "bun installation completed with warnings: $bunOutput" "Warning"
        }
    }
    catch {
        Write-ColorOutput "Failed to install Grok CLI using bun: $_" "Warning"
    }
}
elseif ($npmAvailable) {
    try {
        Write-ColorOutput "Found 'npm' package manager. Installing @vibe-kit/grok-cli..." "Info"
        $npmOutput = npm install -g @vibe-kit/grok-cli 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Successfully installed @vibe-kit/grok-cli using npm" "Success"
        }
        else {
            Write-ColorOutput "npm installation completed with warnings: $npmOutput" "Warning"
        }
    }
    catch {
        Write-ColorOutput "Failed to install Grok CLI using npm: $_" "Warning"
    }
}
else {
    Write-ColorOutput "Neither 'bun' nor 'npm' package manager found. Skipping Grok CLI tool installation." "Warning"
    Write-ColorOutput "Please install Node.js (npm) or Bun to use the Grok CLI tool." "Warning"
}

#endregion

#region VS Code Setup - Extension Installation

Write-ColorOutput "`nSetting up Visual Studio Code extensions..." "Info"

# Check if VS Code CLI is available
$codeAvailable = $null -ne (Get-Command "code" -ErrorAction SilentlyContinue)

if (-not $codeAvailable) {
    Write-ColorOutput "VS Code CLI ('code' command) not found in PATH." "Error"
    Write-ColorOutput "Please ensure VS Code is installed and the 'code' command is available." "Error"
    Write-ColorOutput "You can add 'code' to PATH from VS Code: Command Palette > 'Shell Command: Install code command in PATH'" "Info"
    exit 1
}

# Install VS Code extensions
$extensions = @(
    @{Id = "ErikKralj.vscode-grok"; Name = "Simply Grok for VSCode"},
    @{Id = "ndestates.grok-integration"; Name = "Grok AI Integration"}
)

foreach ($ext in $extensions) {
    try {
        Write-ColorOutput "Installing $($ext.Name) ($($ext.Id))..." "Info"
        $output = code --install-extension $ext.Id --force 2>&1

        if ($LASTEXITCODE -eq 0 -or $output -match "already installed") {
            Write-ColorOutput "Successfully installed $($ext.Name)" "Success"
        }
        else {
            Write-ColorOutput "Installation completed with warnings for $($ext.Name): $output" "Warning"
        }
    }
    catch {
        Write-ColorOutput "Failed to install $($ext.Name): $_" "Warning"
    }
}

#endregion

#region VS Code Setup - Settings Configuration

Write-ColorOutput "`nConfiguring VS Code settings..." "Info"

# Locate VS Code settings.json file
if ($IsWindows -or $env:OS -match "Windows") {
    $settingsPath = "$env:APPDATA\Code\User\settings.json"
}
elseif ($IsMacOS -or $env:OS -match "Darwin") {
    $settingsPath = "$HOME/Library/Application Support/Code/User/settings.json"
}
else {
    # Linux
    $settingsPath = "$HOME/.config/Code/User/settings.json"
}

# Create settings directory if it doesn't exist
$settingsDir = Split-Path -Path $settingsPath -Parent
if (-not (Test-Path $settingsDir)) {
    New-Item -Path $settingsDir -ItemType Directory -Force | Out-Null
    Write-ColorOutput "Created VS Code settings directory: $settingsDir" "Info"
}

# Load or create settings.json
$settings = @{}
if (Test-Path $settingsPath) {
    try {
        $settingsContent = Get-Content -Path $settingsPath -Raw
        $settings = $settingsContent | ConvertFrom-Json -AsHashtable
        Write-ColorOutput "Loaded existing settings.json from: $settingsPath" "Info"
    }
    catch {
        Write-ColorOutput "Could not parse existing settings.json. Creating new configuration." "Warning"
        $settings = @{}
    }
}
else {
    Write-ColorOutput "No existing settings.json found. Creating new file at: $settingsPath" "Info"
}

# Update settings with Grok configuration
$settingsToUpdate = @{
    "vscodeGrok.apiKey" = $XaiApiKey_PlainText
    "vscodeGrok.model" = $GrokModel
    "grokIntegration.apiKey" = $XaiApiKey_PlainText
    "grokIntegration.model" = $GrokModel
}

$updatedCount = 0
foreach ($key in $settingsToUpdate.Keys) {
    if ($settings.ContainsKey($key)) {
        if ($settings[$key] -ne $settingsToUpdate[$key]) {
            $settings[$key] = $settingsToUpdate[$key]
            $updatedCount++
            Write-ColorOutput "Updated setting: $key" "Info"
        }
    }
    else {
        $settings[$key] = $settingsToUpdate[$key]
        $updatedCount++
        Write-ColorOutput "Added setting: $key" "Info"
    }
}

# Save settings.json with proper formatting
try {
    $settings | ConvertTo-Json -Depth 10 | Set-Content -Path $settingsPath -Encoding UTF8
    Write-ColorOutput "Successfully configured VS Code settings.json ($updatedCount settings updated)" "Success"
}
catch {
    Write-ColorOutput "Failed to save settings.json: $_" "Error"
    throw
}

#endregion

# Clear sensitive data from memory
$XaiApiKey_PlainText = $null
[System.GC]::Collect()

#region Final Instructions

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  Setup Complete!" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

Write-ColorOutput "Grok integration has been successfully configured for CLI and VS Code." "Success"

Write-Host "`n📋 Next Steps - Manual Configuration Required:`n" -ForegroundColor Yellow

Write-Host "1. " -NoNewline -ForegroundColor White
Write-Host "Cline Extension" -ForegroundColor Cyan
Write-Host "   • Open VS Code and access the Cline extension UI" -ForegroundColor Gray
Write-Host "   • Select 'Grok' as your model provider" -ForegroundColor Gray
Write-Host "   • Paste your xAI API key in the configuration" -ForegroundColor Gray
Write-Host ""

Write-Host "2. " -NoNewline -ForegroundColor White
Write-Host "Grok Code Fast 1 Extension" -ForegroundColor Cyan
Write-Host "   • This extension requires authentication via X (Twitter)" -ForegroundColor Gray
Write-Host "   • Follow the extension's authentication flow" -ForegroundColor Gray
Write-Host "   • Sign in with your X account credentials" -ForegroundColor Gray
Write-Host ""

Write-Host "3. " -NoNewline -ForegroundColor White
Write-Host "Verify Installation" -ForegroundColor Cyan
Write-Host "   • Restart VS Code to ensure all changes take effect" -ForegroundColor Gray
Write-Host "   • Test the Grok CLI by running: grok --version" -ForegroundColor Gray
Write-Host "   • Check that extensions are active in VS Code" -ForegroundColor Gray
Write-Host ""

Write-ColorOutput "⚠ Important: You may need to restart your terminal/PowerShell session for environment variables to take effect." "Warning"

Write-Host "`n========================================`n" -ForegroundColor Magenta

#endregion
