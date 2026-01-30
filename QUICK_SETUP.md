# 🚀 ΩmegA Quick Setup Guide

Get ΩmegA running from anywhere with auto-start on login!

## One-Command Setup

```bash
cd ~/omega_rust
./setup-autostart.sh
```

This will:
- ✅ Build ΩmegA in release mode
- ✅ Install `omega` command globally
- ✅ Enable filesystem access for all directories
- ✅ Create Ollama auto-start service
- ✅ Configure shell for optional auto-launch

## After Setup

### Option 1: Run from Anywhere (Recommended)

```bash
# From any directory:
omega
```

ΩmegA will start with access to your current directory and all subdirectories!

### Option 2: Auto-Start on Login

Edit your shell config file (setup will tell you which one):

```bash
nano ~/.bashrc    # or ~/.zshrc
```

Find this section near the bottom:

```bash
# ΩmegA auto-start
# Automatically launch ΩmegA in interactive terminals
if [[ $- == *i* ]] && [ -z "$OMEGA_STARTED" ]; then
    export OMEGA_STARTED=1
    # omega     <-- Remove the # to enable auto-start
fi
```

**Remove the `#` before `omega`** to enable auto-start:

```bash
    omega     # Now active!
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`), then:

```bash
source ~/.bashrc
```

Now every new terminal will auto-launch ΩmegA!

### Option 3: Manual Start (with auto Ollama)

```bash
~/omega_rust/start-omega.sh
```

## What Each Script Does

### `setup-autostart.sh` (One-time setup)
- Builds ΩmegA
- Installs to `~/.local/bin/omega`
- Enables filesystem access
- Creates Ollama systemd service
- Configures shell RC file

### `start-omega.sh` (Manual launcher)
- Checks if Ollama is running
- Starts Ollama if needed
- Launches ΩmegA TUI

### `omega` command (Global launcher)
- Runs ΩmegA from any directory
- Automatically loads capabilities
- Gives ΩmegA access to current directory

## Verify Setup

### Check Ollama Service

```bash
systemctl --user status ollama
```

Should show: `Active: active (running)`

### Check omega Command

```bash
which omega
```

Should show: `/home/mega/.local/bin/omega`

### Test from Different Directory

```bash
cd /tmp
omega
```

ΩmegA should launch with access to `/tmp`!

## Usage Examples

### Work in Your Home Directory
```bash
cd ~
omega
# Ask: "list all my markdown files"
```

### Work in a Project Directory
```bash
cd ~/my-project
omega
# Ask: "analyze the code structure"
# Ask: "create a README for this project"
```

### Work in Downloads
```bash
cd ~/Downloads
omega
# Ask: "organize these files"
```

## Troubleshooting

### "omega: command not found"

Add to your shell config:
```bash
export PATH="$HOME/.local/bin:$PATH"
```

Then: `source ~/.bashrc`

### "Ollama connection error"

Start Ollama manually:
```bash
systemctl --user start ollama
# or
ollama serve
```

### "Permission denied"

Make sure scripts are executable:
```bash
chmod +x ~/omega_rust/*.sh
```

## Disable Auto-Start

Edit your shell config and add `#` back:
```bash
    # omega     # Disabled
```

Or remove the entire ΩmegA section.

## Uninstall

```bash
# Remove omega command
rm ~/.local/bin/omega

# Stop and disable Ollama service
systemctl --user stop ollama
systemctl --user disable ollama
rm ~/.config/systemd/user/ollama.service

# Remove auto-start from shell config
# Edit ~/.bashrc and remove the ΩmegA section
```

---

**That's it! Enjoy ΩmegA from anywhere! 🎉**
