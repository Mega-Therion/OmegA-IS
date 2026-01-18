#!/bin/bash
#
# OMEGA-OS First Boot Wizard
# Runs on first boot to configure the system
#

set -e

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Marker file
FIRST_BOOT_MARKER="/etc/omega/.first-boot-done"

# Check if already configured
if [[ -f "$FIRST_BOOT_MARKER" ]]; then
    exit 0
fi

clear
echo -e "${CYAN}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════╗
║   ██████╗ ███╗   ███╗███████╗ ██████╗  █████╗       ██████╗ ███████╗   ║
║  ██╔═══██╗████╗ ████║██╔════╝██╔════╝ ██╔══██╗     ██╔═══██╗██╔════║   ║
║  ██║   ██║██╔████╔██║█████╗  ██║  ███╗███████║ ███ ██║   ██║███████║   ║
║  ██║   ██║██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║     ██║   ██║╚════██║   ║
║  ╚██████╔╝██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║     ╚██████╔╝███████║   ║
║   ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝      ╚═════╝ ╚══════╝   ║
║                                                                   ║
║                     Welcome to OMEGA-OS                           ║
║              First Boot Configuration Wizard                      ║
╚═══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo "This wizard will help you configure your OMEGA Brain system."
echo ""

# Step 1: Timezone
echo -e "${CYAN}Step 1: Configure Timezone${NC}"
echo "Current timezone: $(cat /etc/timezone 2>/dev/null || echo 'Not set')"
read -p "Enter timezone (e.g., America/New_York, Europe/London, or press Enter to skip): " TZ

if [[ -n "$TZ" ]]; then
    if [[ -f "/usr/share/zoneinfo/$TZ" ]]; then
        timedatectl set-timezone "$TZ"
        echo -e "${GREEN}✓ Timezone set to $TZ${NC}"
    else
        echo -e "${YELLOW}! Invalid timezone, skipping${NC}"
    fi
fi

echo ""

# Step 2: Network
echo -e "${CYAN}Step 2: Network Configuration${NC}"
echo "Detected networks:"
nmcli device status 2>/dev/null | grep -E 'wifi|ethernet' || echo "No devices found"
echo ""

read -p "Would you like to connect to WiFi? (y/n): " WIFI_CHOICE

if [[ "$WIFI_CHOICE" == "y" ]]; then
    echo ""
    echo "Available WiFi networks:"
    nmcli device wifi list 2>/dev/null | head -20
    echo ""
    read -p "Enter WiFi SSID: " WIFI_SSID
    read -sp "Enter WiFi password: " WIFI_PASS
    echo ""
    
    if nmcli device wifi connect "$WIFI_SSID" password "$WIFI_PASS" 2>/dev/null; then
        echo -e "${GREEN}✓ Connected to $WIFI_SSID${NC}"
    else
        echo -e "${YELLOW}! Failed to connect. You can configure later with: nmcli device wifi connect \"SSID\" password \"PASSWORD\"${NC}"
    fi
fi

echo ""

# Step 3: Change Password
echo -e "${CYAN}Step 3: Security Configuration${NC}"
read -p "Would you like to change the default password? (y/n): " PASS_CHOICE

if [[ "$PASS_CHOICE" == "y" ]]; then
    passwd omega
fi

echo ""

# Step 4: API Keys
echo -e "${CYAN}Step 4: API Configuration${NC}"
echo "OMEGA Brain can connect to various AI services."
echo "Your API keys are stored locally in /etc/omega/config"
echo ""

read -p "Configure API keys now? (y/n): " API_CHOICE

if [[ "$API_CHOICE" == "y" ]]; then
    echo ""
    read -p "OpenAI API Key (Enter to skip): " OPENAI_KEY
    read -p "Anthropic API Key (Enter to skip): " ANTHROPIC_KEY
    read -p "Google API Key (Enter to skip): " GOOGLE_KEY
    
    CONFIG_FILE="/etc/omega/config"
    
    if [[ -n "$OPENAI_KEY" ]]; then
        sed -i "s/# OPENAI_API_KEY=/OPENAI_API_KEY=$OPENAI_KEY/" "$CONFIG_FILE" 2>/dev/null || \
        echo "OPENAI_API_KEY=$OPENAI_KEY" >> "$CONFIG_FILE"
    fi
    
    if [[ -n "$ANTHROPIC_KEY" ]]; then
        sed -i "s/# ANTHROPIC_API_KEY=/ANTHROPIC_API_KEY=$ANTHROPIC_KEY/" "$CONFIG_FILE" 2>/dev/null || \
        echo "ANTHROPIC_API_KEY=$ANTHROPIC_KEY" >> "$CONFIG_FILE"
    fi
    
    if [[ -n "$GOOGLE_KEY" ]]; then
        sed -i "s/# GOOGLE_API_KEY=/GOOGLE_API_KEY=$GOOGLE_KEY/" "$CONFIG_FILE" 2>/dev/null || \
        echo "GOOGLE_API_KEY=$GOOGLE_KEY" >> "$CONFIG_FILE"
    fi
    
    echo -e "${GREEN}✓ API keys saved${NC}"
fi

echo ""

# Mark first boot as complete
mkdir -p /etc/omega
touch "$FIRST_BOOT_MARKER"

# Summary
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    Configuration Complete!                        ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "OMEGA Brain is ready to use!"
echo ""
echo "Quick Start:"
echo "  • Open browser to: http://localhost:3001"
echo "  • Or use terminal: omega chat \"Hello!\""
echo "  • Edit config: sudo nano /etc/omega/config"
echo ""
echo "Starting OMEGA Brain..."
sleep 2

# Launch OMEGA Brain
/opt/omega-brain/scripts/start-omega.sh &

exit 0
