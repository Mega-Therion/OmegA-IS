# Grok (xAI) Integration Setup Script

## Overview

This PowerShell script automates the complete setup of Grok (xAI) integration for both Command-Line Interface (CLI) and Visual Studio Code environments. The script is idempotent, meaning it can be run multiple times safely without causing issues.

## Features

### ✅ Automated Configuration

- **Environment Variables**: Sets `XAI_API_KEY` persistently for your user profile and current session
- **CLI Tool**: Installs `@vibe-kit/grok-cli` using bun (preferred) or npm (fallback)
- **VS Code Extensions**: Installs essential Grok extensions automatically
- **Settings Configuration**: Updates VS Code `settings.json` with API key and model preferences

### 🔒 Security

- Accepts API key as a `SecureString` parameter
- Securely converts to plain text only when necessary for system operations
- Clears sensitive data from memory after use

### 🎨 User Experience

- Color-coded console output for easy status tracking
- Clear success/warning/error messages
- Comprehensive final instructions for manual steps

## Prerequisites

### Required
- **PowerShell 5.1 or higher** (Windows PowerShell or PowerShell Core)
- **Visual Studio Code** with the `code` CLI command available in PATH
- **xAI API Key** (obtain from [console.x.ai](https://console.x.ai))

### Optional (for CLI tool)
- **Bun** (preferred) or **Node.js/npm** for installing the Grok CLI tool

## Installation

### Step 1: Download the Script

Save the `Setup-GrokIntegration.ps1` script to your preferred location.

### Step 2: Execution Policy (Windows Only)

If running on Windows, you may need to adjust your PowerShell execution policy:

```powershell
# Check current execution policy
Get-ExecutionPolicy

# Set execution policy to allow local scripts (requires Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Usage

### Basic Usage

```powershell
# Navigate to the script directory
cd path\to\script

# Run the script (you'll be prompted for the API key)
$apiKey = Read-Host -AsSecureString -Prompt "Enter your xAI API Key"
.\Setup-GrokIntegration.ps1 -XaiApiKey $apiKey
```

### Advanced Usage (Custom Model)

```powershell
# Specify a custom Grok model
$apiKey = Read-Host -AsSecureString -Prompt "Enter your xAI API Key"
.\Setup-GrokIntegration.ps1 -XaiApiKey $apiKey -GrokModel "grok-code-fast-1"
```

### One-Liner Execution

```powershell
.\Setup-GrokIntegration.ps1 -XaiApiKey (Read-Host -AsSecureString -Prompt "Enter your xAI API Key")
```

## What the Script Does

### 1. CLI Environment Setup ✓

- Sets `XAI_API_KEY` environment variable (User scope - persistent across sessions)
- Sets `XAI_API_KEY` for the current PowerShell session
- Installs `@vibe-kit/grok-cli` globally using bun or npm

### 2. VS Code Extension Installation ✓

Installs two primary extensions:
- **Simply Grok for VSCode** (`ErikKralj.vscode-grok`)
- **Grok AI Integration** (`ndestates.grok-integration`)

### 3. VS Code Configuration ✓

Updates your `settings.json` with:
```json
{
  "vscodeGrok.apiKey": "your-api-key",
  "vscodeGrok.model": "grok-code-fast-1",
  "grokIntegration.apiKey": "your-api-key",
  "grokIntegration.model": "grok-code-fast-1"
}
```

## Manual Configuration Required

The following extensions require manual setup that cannot be automated:

### 🔧 Cline Extension

1. Open VS Code
2. Access the Cline extension UI
3. Select "Grok" as your model provider
4. Paste your xAI API key in the configuration

### 🔧 Grok Code Fast 1 Extension

1. This extension requires X (Twitter) account authentication
2. Follow the extension's authentication flow
3. Sign in with your X account credentials

## Settings File Locations

The script automatically detects your operating system and updates the appropriate settings file:

- **Windows**: `%APPDATA%\Code\User\settings.json`
- **macOS**: `~/Library/Application Support/Code/User/settings.json`
- **Linux**: `~/.config/Code/User/settings.json`

## Troubleshooting

### VS Code CLI Not Found

**Error**: "VS Code CLI ('code' command) not found in PATH"

**Solution**:
1. Open VS Code
2. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Type and select: `Shell Command: Install 'code' command in PATH`
4. Restart your terminal and run the script again

### Package Manager Not Found

**Warning**: "Neither 'bun' nor 'npm' package manager found"

**Solution**:
- Install [Node.js](https://nodejs.org/) for npm support, or
- Install [Bun](https://bun.sh/) for faster package management
- The script will continue with VS Code setup even if this step fails

### Environment Variable Not Taking Effect

**Issue**: CLI tools can't find the API key

**Solution**:
- Restart your terminal/PowerShell session
- Run: `$env:XAI_API_KEY` to verify the variable is set
- If not set, run the script again

### Settings.json Parse Error

**Warning**: "Could not parse existing settings.json"

**Solution**:
- The script will create a new configuration
- Manually merge any existing settings you want to keep
- Ensure your settings.json is valid JSON before running the script again

## Verification Steps

After running the script, verify the installation:

### 1. Check Environment Variable
```powershell
# PowerShell
$env:XAI_API_KEY

# Should output your API key
```

### 2. Verify CLI Tool
```powershell
grok --version

# Should display the Grok CLI version
```

### 3. Check VS Code Extensions
```powershell
code --list-extensions | Select-String "grok"

# Should show:
# ErikKralj.vscode-grok
# ndestates.grok-integration
```

### 4. Inspect Settings
```powershell
# Open VS Code settings
code ~/.config/Code/User/settings.json  # Linux
code ~/Library/Application\ Support/Code/User/settings.json  # macOS
code $env:APPDATA\Code\User\settings.json  # Windows
```

## Parameters Reference

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `XaiApiKey` | SecureString | Yes | - | Your xAI API key for Grok integration |
| `GrokModel` | String | No | `"grok-code-fast-1"` | The Grok model to use in VS Code |

## Available Grok Models

Common model options:
- `grok-code-fast-1` (default, optimized for speed)
- `grok-2-latest`
- `grok-vision-latest`

Refer to [xAI documentation](https://docs.x.ai/docs) for the latest model names.

## Script Output Examples

### Successful Execution
```
========================================
  Grok (xAI) Integration Setup Script
========================================

ℹ Setting up CLI environment variables...
✓ Successfully set XAI_API_KEY environment variable (User scope - Persistent)
✓ Successfully set XAI_API_KEY environment variable (Current session)

ℹ Installing Grok CLI tool...
ℹ Found 'bun' package manager. Installing @vibe-kit/grok-cli...
✓ Successfully installed @vibe-kit/grok-cli using bun

ℹ Setting up Visual Studio Code extensions...
ℹ Installing Simply Grok for VSCode (ErikKralj.vscode-grok)...
✓ Successfully installed Simply Grok for VSCode
ℹ Installing Grok AI Integration (ndestates.grok-integration)...
✓ Successfully installed Grok AI Integration

ℹ Configuring VS Code settings...
✓ Successfully configured VS Code settings.json (4 settings updated)

========================================
  Setup Complete!
========================================
```

## Security Considerations

1. **API Key Storage**: Your API key is stored in plain text in:
   - Environment variables (User scope)
   - VS Code settings.json

2. **Recommended Practice**:
   - Keep your `settings.json` file secure
   - Never commit API keys to version control
   - Consider using VS Code's secure storage features when available

3. **Key Rotation**: If you need to rotate your API key:
   - Simply rerun the script with the new key
   - The script will update all configurations

## Uninstallation

To remove Grok integration:

### Remove Environment Variable
```powershell
[Environment]::SetEnvironmentVariable("XAI_API_KEY", $null, "User")
Remove-Item Env:\XAI_API_KEY
```

### Uninstall CLI Tool
```powershell
# Using bun
bun remove -g @vibe-kit/grok-cli

# Using npm
npm uninstall -g @vibe-kit/grok-cli
```

### Uninstall VS Code Extensions
```powershell
code --uninstall-extension ErikKralj.vscode-grok
code --uninstall-extension ndestates.grok-integration
```

### Remove Settings
Manually remove the following keys from your `settings.json`:
- `vscodeGrok.apiKey`
- `vscodeGrok.model`
- `grokIntegration.apiKey`
- `grokIntegration.model`

## Support and Resources

- **xAI Console**: [console.x.ai](https://console.x.ai)
- **xAI Documentation**: [docs.x.ai](https://docs.x.ai/docs)
- **Grok CLI Repository**: [vibe-kit/grok-cli](https://github.com/vibe-kit/grok-cli)

## License

This script is provided as-is for automation purposes. Use at your own discretion.

## Version History

- **v1.0** (2026-01-03): Initial release
  - CLI environment setup
  - Grok CLI tool installation
  - VS Code extension installation
  - Settings configuration automation

---

**Created by**: gAIng-brAin Automation
**Last Updated**: 2026-01-03
