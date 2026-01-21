# OMEGA-OS

> Portable Linux distribution with OmegAI Brain pre-installed.
> Like Kali Linux, but for AI orchestration.

## Overview

OMEGA-OS is a bootable Linux environment containing the complete OMEGA Brain ecosystem, designed to run from a USB drive. Boot any computer into your personal AI command center.

## Features

- 🔒 **Secure**: Air-gapped operation possible
- 🚀 **Portable**: Runs from USB drive
- 💾 **Persistent**: Save your sessions and data
- ⚡ **Fast**: Lightweight Debian-based system
- 🧠 **Complete**: All OMEGA tools pre-installed

## What's Included

### Core
- Node.js 20 LTS
- Python 3.11+
- gAIng-Brain Server
- OMEGA CLI
- All agent workers

### Interfaces
- Jarvis Web UI (auto-launches)
- Desktop App (Electron)
- Terminal (with omega CLI)

### Tools
- Visual Studio Code (with extensions)
- Git
- Docker (optional)
- Network tools

## Build Instructions

### Prerequisites
- Linux host machine (Ubuntu 22.04+ recommended)
- 16GB+ USB drive (USB 3.0 recommended)
- ~8GB free disk space for build

### Quick Build
```bash
cd omega-os
chmod +x build.sh
sudo ./build.sh --output /dev/sdX
```

### Build Options
```bash
./build.sh --help

Options:
  --output, -o    Target device or ISO filename
  --size          Partition size (default: auto)
  --persistence   Enable persistent storage
  --minimal       Minimal install (no desktop)
  --iso           Create ISO instead of bootable USB
```

## Usage

### Boot from USB
1. Insert USB drive
2. Boot computer and access boot menu (F12, F2, or ESC depending on manufacturer)
3. Select USB drive
4. OMEGA-OS will boot and auto-start Jarvis

### First Boot
On first boot, you'll be prompted to:
1. Set timezone
2. Configure network
3. Enter API keys (optional)

### Default Credentials
- Username: `omega`
- Password: `brainpower`
- Root password: `omegaroot`

## File Structure

```
omega-os/
├── build.sh              # Main build script
├── Dockerfile            # Docker-based build environment
├── config/
│   ├── packages.list     # Base system packages
│   ├── node-packages     # Node.js packages
│   ├── python-packages   # Python packages
│   └── autostart.desktop # Auto-start config
├── rootfs/
│   ├── etc/              # System configuration
│   │   └── omega/
│   │       └── config    # OMEGA default config
│   ├── opt/
│   │   └── omega-brain/  # Pre-installed brain
│   └── usr/
│       └── local/
│           └── bin/      # Symlinks (omega, jarvis)
├── scripts/
│   ├── first-boot.sh     # First boot wizard
│   ├── start-omega.sh    # Main startup script
│   └── backup.sh         # Session backup
└── README.md
```

## Customization

### Adding Your API Keys
Edit `/etc/omega/config` after booting:
```bash
sudo nano /etc/omega/config
```

### Changing Auto-Start Behavior
Edit `/home/omega/.config/autostart/omega.desktop`

### Installing Additional Software
```bash
sudo apt update
sudo apt install <package>
```

## Persistence

By default, OMEGA-OS runs in RAM and changes are lost on reboot.

To enable persistence:
1. Boot with `persistence` kernel parameter
2. Or use the `--persistence` flag during build

Persistent files are stored in a separate partition on the USB.

## Security Considerations

### Online Mode
- All your usual API services work
- ngrok tunneling available
- Cloud sync enabled

### Offline Mode
- Local LLM support (Ollama)
- Local embeddings
- No external connections

### Air-Gapped Mode
- Completely isolated
- No network interfaces active
- Maximum security for sensitive work

## Troubleshooting

### Boot Issues
- Disable Secure Boot in BIOS
- Try Legacy/CSM mode
- Use different USB port

### Performance Issues
- Use USB 3.0 port
- Enable persistence for better performance
- Reduce animations in settings

### Network Issues
```bash
sudo systemctl restart NetworkManager
```

## Contributing

Contributions welcome! See `/docs/CONTRIBUTING.md`.

## License

MIT License - see LICENSE file.

---

*Part of the OMEGA Platform Ecosystem*
