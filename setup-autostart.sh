#!/bin/bash
# ΩmegA Auto-Start Setup Script
# This configures your system to auto-launch ΩmegA on login

set -e

echo "🎨 ΩmegA Auto-Start Setup"
echo "========================="
echo ""

# Step 1: Build and install
echo "📦 Step 1: Building and installing ΩmegA..."
./install.sh

# Step 2: Make scripts executable
echo ""
echo "🔧 Step 2: Setting up launch scripts..."
chmod +x start-omega.sh
chmod +x omega-anywhere.sh

# Step 3: Copy launcher to PATH
echo ""
echo "📋 Step 3: Installing global launcher..."
cp omega-anywhere.sh ~/.local/bin/omega
chmod +x ~/.local/bin/omega

# Step 4: Create systemd user service (optional, for automatic ollama startup)
echo ""
echo "🔧 Step 4: Creating Ollama service..."
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/ollama.service <<'EOF'
[Unit]
Description=Ollama Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF

# Enable the service
systemctl --user enable ollama.service 2>/dev/null || true
systemctl --user start ollama.service 2>/dev/null || true

# Step 5: Set up terminal auto-launch
echo ""
echo "🖥️  Step 5: Configuring terminal auto-launch..."

# Detect shell
if [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
elif [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
else
    SHELL_RC="$HOME/.profile"
fi

# Check if already configured
if grep -q "# ΩmegA auto-start" "$SHELL_RC" 2>/dev/null; then
    echo "⚠️  Auto-start already configured in $SHELL_RC"
else
    echo ""
    echo "Adding auto-start to $SHELL_RC..."
    cat >> "$SHELL_RC" <<'EOF'

# ΩmegA auto-start
# Automatically launch ΩmegA in interactive terminals
if [[ $- == *i* ]] && [ -z "$OMEGA_STARTED" ]; then
    export OMEGA_STARTED=1
    # Uncomment the line below to auto-start ΩmegA on every new terminal
    # omega
fi
EOF
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "                    🎉 You're All Set! 🎉"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🚀 Quick Start Options:"
echo ""
echo "  1️⃣  Run ΩmegA from anywhere:"
echo "      omega"
echo ""
echo "  2️⃣  Auto-start ΩmegA on login:"
echo "      Edit $SHELL_RC"
echo "      Uncomment the '# omega' line (remove the #)"
echo ""
echo "  3️⃣  Manual start with auto-Ollama:"
echo "      ~/omega_rust/start-omega.sh"
echo ""
echo "  4️⃣  Check Ollama service:"
echo "      systemctl --user status ollama"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📝 What was configured:"
echo "   ✅ ΩmegA installed to ~/.local/bin/omega"
echo "   ✅ Filesystem access enabled in capabilities.toml"
echo "   ✅ Ollama systemd service created (auto-starts on boot)"
echo "   ✅ Shell RC configured (auto-start commented out)"
echo ""
echo "🔄 To apply changes, run:"
echo "   source $SHELL_RC"
echo ""
echo "Then just type: omega"
echo ""
