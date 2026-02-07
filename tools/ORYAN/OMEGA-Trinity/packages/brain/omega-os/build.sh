#!/bin/bash
#
# OMEGA-OS Build Script
# Creates a bootable USB or ISO with the complete OMEGA Brain ecosystem
#
# Usage:
#   ./build.sh --output /dev/sdX       # Create bootable USB
#   ./build.sh --iso omega-os.iso      # Create ISO file
#
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BUILD_DIR="/tmp/omega-os-build"
ROOTFS_DIR="${BUILD_DIR}/rootfs"
OMEGA_VERSION="1.0.0"
DEBIAN_VERSION="bookworm"
ARCH="amd64"

# Default options
OUTPUT=""
PERSISTENCE=false
MINIMAL=false
ISO_MODE=false

# Functions
log() { echo -e "${CYAN}[OMEGA-OS]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1" >&2; exit 1; }

banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                   ║"
    echo "║   ██████╗ ███╗   ███╗███████╗ ██████╗  █████╗        ██████╗ ███████╗║"
    echo "║  ██╔═══██╗████╗ ████║██╔════╝██╔════╝ ██╔══██╗      ██╔═══██╗██╔════╝║"
    echo "║  ██║   ██║██╔████╔██║█████╗  ██║  ███╗███████║█████╗██║   ██║███████╗║"
    echo "║  ██║   ██║██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║╚════╝██║   ██║╚════██║║"
    echo "║  ╚██████╔╝██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║      ╚██████╔╝███████║║"
    echo "║   ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝       ╚═════╝ ╚══════╝║"
    echo "║                                                                   ║"
    echo "║              Portable AI Brain Operating System                   ║"
    echo "║                       Version ${OMEGA_VERSION}                             ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -o, --output <dev|file>  Target device (/dev/sdX) or ISO filename"
    echo "  -p, --persistence        Enable persistent storage partition"
    echo "  -m, --minimal            Minimal install (no desktop environment)"
    echo "  --iso                    Force ISO creation mode"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  sudo $0 --output /dev/sdb                  # Create bootable USB"
    echo "  $0 --output omega-os.iso --iso             # Create ISO file"
    echo "  sudo $0 --output /dev/sdc --persistence    # USB with persistent storage"
}

check_root() {
    if [[ $EUID -ne 0 ]] && [[ "$ISO_MODE" != "true" ]]; then
        error "This script requires root privileges for USB creation. Use sudo."
    fi
}

check_dependencies() {
    log "Checking dependencies..."
    
    local deps=("debootstrap" "xorriso" "syslinux" "mtools" "squashfs-tools")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done
    
    if [[ ${#missing[@]} -ne 0 ]]; then
        warn "Missing dependencies: ${missing[*]}"
        log "Installing dependencies..."
        apt-get update && apt-get install -y "${missing[@]}"
    fi
    
    success "All dependencies satisfied"
}

create_rootfs() {
    log "Creating root filesystem with debootstrap..."
    
    mkdir -p "$ROOTFS_DIR"
    
    debootstrap --arch=$ARCH --variant=minbase \
        --include=linux-image-amd64,live-boot,systemd-sysv \
        $DEBIAN_VERSION "$ROOTFS_DIR" http://deb.debian.org/debian
    
    success "Base system created"
}

install_packages() {
    log "Installing OMEGA-OS packages..."
    
    # Mount required filesystems
    mount --bind /dev "$ROOTFS_DIR/dev"
    mount --bind /dev/pts "$ROOTFS_DIR/dev/pts"
    mount -t proc proc "$ROOTFS_DIR/proc"
    mount -t sysfs sysfs "$ROOTFS_DIR/sys"
    
    # Create sources.list
    cat > "$ROOTFS_DIR/etc/apt/sources.list" << EOF
deb http://deb.debian.org/debian ${DEBIAN_VERSION} main contrib non-free non-free-firmware
deb http://deb.debian.org/debian ${DEBIAN_VERSION}-updates main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security ${DEBIAN_VERSION}-security main contrib non-free non-free-firmware
EOF
    
    # Install packages inside chroot
    chroot "$ROOTFS_DIR" /bin/bash << 'CHROOT_EOF'
        apt-get update
        
        # Base system
        apt-get install -y --no-install-recommends \
            sudo curl wget git vim nano htop \
            network-manager firmware-linux-free \
            ca-certificates gnupg
        
        # Node.js 20
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
        apt-get update
        apt-get install -y nodejs
        
        # Python
        apt-get install -y python3 python3-pip python3-venv
        
        # Optional desktop environment (if not minimal)
        DEBIAN_FRONTEND=noninteractive apt-get install -y \
            xorg xfce4 xfce4-terminal firefox-esr
        
        # Clean up
        apt-get clean
        rm -rf /var/lib/apt/lists/*
CHROOT_EOF
    
    success "Packages installed"
}

install_omega_brain() {
    log "Installing OMEGA Brain..."
    
    # Clone or copy gAIng-Brain
    local BRAIN_DIR="$ROOTFS_DIR/opt/omega-brain"
    mkdir -p "$BRAIN_DIR"
    
    # Copy from current installation (assumes running from gAIng-Brain directory)
    if [[ -d "$(dirname "$0")/../src" ]]; then
        cp -r "$(dirname "$0")/.." "$BRAIN_DIR/"
        rm -rf "$BRAIN_DIR/.git" "$BRAIN_DIR/node_modules"
    else
        # Clone from GitHub
        git clone https://github.com/Mega-Therion/gAIng-Brain.git "$BRAIN_DIR"
    fi
    
    # Install dependencies
    chroot "$ROOTFS_DIR" /bin/bash -c "cd /opt/omega-brain && npm install --production"
    
    # Create CLI symlinks
    chroot "$ROOTFS_DIR" ln -sf /opt/omega-brain/cli/omega.js /usr/local/bin/omega
    chroot "$ROOTFS_DIR" chmod +x /opt/omega-brain/cli/omega.js
    
    success "OMEGA Brain installed"
}

configure_system() {
    log "Configuring system..."
    
    # Hostname
    echo "omega-os" > "$ROOTFS_DIR/etc/hostname"
    
    # Hosts
    cat > "$ROOTFS_DIR/etc/hosts" << EOF
127.0.0.1   localhost
127.0.1.1   omega-os
::1         localhost ip6-localhost ip6-loopback
EOF
    
    # Create omega user
    chroot "$ROOTFS_DIR" useradd -m -s /bin/bash -G sudo omega
    echo "omega:brainpower" | chroot "$ROOTFS_DIR" chpasswd
    echo "root:omegaroot" | chroot "$ROOTFS_DIR" chpasswd
    
    # Auto-login configuration
    mkdir -p "$ROOTFS_DIR/etc/lightdm/lightdm.conf.d"
    cat > "$ROOTFS_DIR/etc/lightdm/lightdm.conf.d/autologin.conf" << EOF
[Seat:*]
autologin-user=omega
autologin-user-timeout=0
EOF
    
    # OMEGA config directory
    mkdir -p "$ROOTFS_DIR/etc/omega"
    cat > "$ROOTFS_DIR/etc/omega/config" << EOF
# OMEGA Brain Configuration
OMEGA_API_URL=http://localhost:8080
OMEGA_AGENT=gemini
JARVIS_PORT=3001

# API Keys (configure these)
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# GOOGLE_API_KEY=
EOF
    
    # Autostart script
    mkdir -p "$ROOTFS_DIR/home/omega/.config/autostart"
    cat > "$ROOTFS_DIR/home/omega/.config/autostart/omega.desktop" << EOF
[Desktop Entry]
Type=Application
Name=OMEGA Brain
Exec=/opt/omega-brain/scripts/start-omega.sh
Terminal=false
Hidden=false
EOF
    
    chroot "$ROOTFS_DIR" chown -R omega:omega /home/omega
    
    success "System configured"
}

create_startup_script() {
    log "Creating startup script..."
    
    mkdir -p "$ROOTFS_DIR/opt/omega-brain/scripts"
    cat > "$ROOTFS_DIR/opt/omega-brain/scripts/start-omega.sh" << 'EOF'
#!/bin/bash
# OMEGA Brain Startup Script

# Load config
source /etc/omega/config

# Start backend
cd /opt/omega-brain
npm start &

# Wait for backend
sleep 3

# Start Jarvis
cd /opt/omega-brain/Jarvis
npm run dev &

# Open browser to Jarvis
sleep 2
xdg-open http://localhost:3001 &

echo "OMEGA Brain is now running!"
echo "  Backend: http://localhost:8080"
echo "  Jarvis:  http://localhost:3001"
EOF
    
    chmod +x "$ROOTFS_DIR/opt/omega-brain/scripts/start-omega.sh"
    
    success "Startup script created"
}

create_squashfs() {
    log "Creating squashfs filesystem..."
    
    # Unmount chroot filesystems
    umount "$ROOTFS_DIR/proc" 2>/dev/null || true
    umount "$ROOTFS_DIR/sys" 2>/dev/null || true
    umount "$ROOTFS_DIR/dev/pts" 2>/dev/null || true
    umount "$ROOTFS_DIR/dev" 2>/dev/null || true
    
    mkdir -p "${BUILD_DIR}/image/live"
    
    mksquashfs "$ROOTFS_DIR" "${BUILD_DIR}/image/live/filesystem.squashfs" \
        -comp xz -Xbcj x86 -b 1M
    
    success "Squashfs created"
}

setup_bootloader() {
    log "Setting up bootloader..."
    
    local IMAGE_DIR="${BUILD_DIR}/image"
    
    # Copy kernel and initrd
    cp "$ROOTFS_DIR/vmlinuz" "${IMAGE_DIR}/live/"
    cp "$ROOTFS_DIR/initrd.img" "${IMAGE_DIR}/live/"
    
    # ISOLINUX configuration
    mkdir -p "${IMAGE_DIR}/isolinux"
    cp /usr/lib/ISOLINUX/isolinux.bin "${IMAGE_DIR}/isolinux/"
    cp /usr/lib/syslinux/modules/bios/*.c32 "${IMAGE_DIR}/isolinux/"
    
    cat > "${IMAGE_DIR}/isolinux/isolinux.cfg" << EOF
UI vesamenu.c32
MENU TITLE OMEGA-OS Boot Menu
DEFAULT live
TIMEOUT 50

LABEL live
    MENU LABEL ^Start OMEGA-OS
    LINUX /live/vmlinuz
    APPEND initrd=/live/initrd.img boot=live

LABEL live-persistent
    MENU LABEL Start OMEGA-OS with ^Persistence
    LINUX /live/vmlinuz
    APPEND initrd=/live/initrd.img boot=live persistence

LABEL live-safe
    MENU LABEL Start OMEGA-OS (^Safe Mode)
    LINUX /live/vmlinuz
    APPEND initrd=/live/initrd.img boot=live nomodeset

LABEL hd
    MENU LABEL Boot from ^Hard Drive
    LOCALBOOT 0x80
EOF
    
    success "Bootloader configured"
}

create_iso() {
    log "Creating ISO image..."
    
    local IMAGE_DIR="${BUILD_DIR}/image"
    local OUTPUT_FILE="$1"
    
    xorriso -as mkisofs \
        -iso-level 3 \
        -full-iso9660-filenames \
        -volid "OMEGA-OS" \
        -eltorito-boot isolinux/isolinux.bin \
        -eltorito-catalog isolinux/boot.cat \
        -no-emul-boot \
        -boot-load-size 4 \
        -boot-info-table \
        -isohybrid-mbr /usr/lib/ISOLINUX/isohdpfx.bin \
        -output "$OUTPUT_FILE" \
        "$IMAGE_DIR"
    
    success "ISO created: $OUTPUT_FILE"
}

write_to_usb() {
    log "Writing to USB device: $1"
    
    local DEVICE="$1"
    local IMAGE_DIR="${BUILD_DIR}/image"
    
    # Confirm device
    warn "WARNING: This will ERASE ALL DATA on $DEVICE"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        error "Aborted by user"
    fi
    
    # Create temporary ISO
    local TEMP_ISO="${BUILD_DIR}/omega-os-temp.iso"
    create_iso "$TEMP_ISO"
    
    # Write to USB
    dd if="$TEMP_ISO" of="$DEVICE" bs=4M status=progress oflag=sync
    
    # Create persistence partition if enabled
    if [[ "$PERSISTENCE" == "true" ]]; then
        log "Creating persistence partition..."
        
        # Get ISO size
        local ISO_SIZE=$(stat -c%s "$TEMP_ISO")
        local START_SECTOR=$((ISO_SIZE / 512 + 1))
        
        # Create persistence partition with remaining space
        parted -s "$DEVICE" mkpart primary ext4 ${START_SECTOR}s 100%
        
        # Format and label
        mkfs.ext4 -L persistence "${DEVICE}2"
        
        # Create persistence config
        mkdir -p /mnt/omega-persistence
        mount "${DEVICE}2" /mnt/omega-persistence
        echo "/ union" > /mnt/omega-persistence/persistence.conf
        umount /mnt/omega-persistence
        
        success "Persistence partition created"
    fi
    
    sync
    success "USB drive ready! You can now boot from $DEVICE"
}

cleanup() {
    log "Cleaning up..."
    
    umount "$ROOTFS_DIR/proc" 2>/dev/null || true
    umount "$ROOTFS_DIR/sys" 2>/dev/null || true
    umount "$ROOTFS_DIR/dev/pts" 2>/dev/null || true
    umount "$ROOTFS_DIR/dev" 2>/dev/null || true
    rm -rf "$BUILD_DIR"
    
    success "Cleanup complete"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -o|--output)
            OUTPUT="$2"
            shift 2
            ;;
        -p|--persistence)
            PERSISTENCE=true
            shift
            ;;
        -m|--minimal)
            MINIMAL=true
            shift
            ;;
        --iso)
            ISO_MODE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Main execution
trap cleanup EXIT

banner

if [[ -z "$OUTPUT" ]]; then
    error "Output device or filename required. Use -o or --output."
fi

# Detect ISO mode from output filename
if [[ "$OUTPUT" == *.iso ]]; then
    ISO_MODE=true
fi

check_root
check_dependencies

log "Starting OMEGA-OS build..."
log "Output: $OUTPUT"
log "Mode: $(if $ISO_MODE; then echo 'ISO'; else echo 'USB'; fi)"
log "Persistence: $PERSISTENCE"
log "Minimal: $MINIMAL"

# Build steps
create_rootfs
install_packages
install_omega_brain
configure_system
create_startup_script
create_squashfs
setup_bootloader

# Output
if [[ "$ISO_MODE" == "true" ]]; then
    create_iso "$OUTPUT"
else
    write_to_usb "$OUTPUT"
fi

success "OMEGA-OS build complete!"
echo ""
echo "Next steps:"
echo "  1. Boot from the USB/ISO"
echo "  2. Login: omega / brainpower"
echo "  3. Configure API keys: sudo nano /etc/omega/config"
echo ""
