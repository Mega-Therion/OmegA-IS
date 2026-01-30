#!/bin/bash
# ΩmegA COMPLETE AUTO-SETUP
# Double-click this file and click "Run in Terminal" or "Execute"
# After this runs once, ΩmegA will auto-start every time you log in!

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "           🚀 ΩmegA Complete Auto-Setup 🚀"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "This will set up ΩmegA to auto-launch when you log in!"
echo "Just sit back and watch... ☕"
echo ""
sleep 2

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Step 1: Build ΩmegA
echo "🔨 Step 1/6: Building ΩmegA..."
cargo build --release
echo "   ✅ Build complete!"
echo ""
sleep 1

# Step 2: Install to local bin
echo "📦 Step 2/6: Installing ΩmegA..."
mkdir -p ~/.local/bin
cp target/release/omega_rust ~/.local/bin/omega
chmod +x ~/.local/bin/omega
echo "   ✅ Installed to ~/.local/bin/omega"
echo ""
sleep 1

# Step 3: Enable filesystem access
echo "🔓 Step 3/6: Enabling filesystem access..."
cat > capabilities.toml <<EOF
# ΩmegA Capability Configuration
allow_network = true      # Allow Ollama API calls
allow_filesystem = true   # Allow access to all your directories
max_parallel_agents = 3   # Number of agents
EOF
echo "   ✅ Full filesystem access enabled!"
echo ""
sleep 1

# Step 4: Add to PATH
echo "🛤️  Step 4/6: Adding to PATH..."
# Detect shell config file
if [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
elif [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
else
    SHELL_RC="$HOME/.profile"
fi

# Add PATH if not already there
if ! grep -q '.local/bin' "$SHELL_RC" 2>/dev/null; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
    echo "   ✅ Added ~/.local/bin to PATH in $SHELL_RC"
else
    echo "   ✅ PATH already configured"
fi
echo ""
sleep 1

# Step 5: Create Ollama auto-start service
echo "🤖 Step 5/6: Setting up Ollama auto-start..."
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
Environment="PATH=/usr/local/bin:/usr/bin:/bin"

[Install]
WantedBy=default.target
EOF

# Try to enable and start the service
if command -v systemctl &> /dev/null; then
    systemctl --user daemon-reload 2>/dev/null || true
    systemctl --user enable ollama.service 2>/dev/null || true
    systemctl --user start ollama.service 2>/dev/null || true
    echo "   ✅ Ollama service configured!"
else
    echo "   ⚠️  systemctl not found, will use fallback method"
fi
echo ""
sleep 1

# Step 6: Create desktop autostart entry
echo "🖥️  Step 6/6: Creating auto-start entry..."
mkdir -p ~/.config/autostart

cat > ~/.config/autostart/omega.desktop <<EOF
[Desktop Entry]
Type=Application
Name=ΩmegA AI Assistant
Comment=Auto-start ΩmegA multi-agent AI system
Exec=$SCRIPT_DIR/autostart-omega.sh
Terminal=true
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
StartupNotify=false
EOF

chmod +x ~/.config/autostart/omega.desktop
echo "   ✅ Auto-start entry created!"
echo ""
sleep 1

# Create the actual autostart script
cat > "$SCRIPT_DIR/autostart-omega.sh" <<'AUTOSTART'
#!/bin/bash
# ΩmegA Autostart Script
# This runs when you log in

# Wait a moment for system to fully load
sleep 3

# Start Ollama if not running
if ! pgrep -x "ollama" > /dev/null; then
    nohup ollama serve > ~/.omega_ollama.log 2>&1 &
    sleep 2
fi

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Launch terminal with ΩmegA
# Try different terminal emulators (gnome-terminal, xfce4-terminal, konsole, etc.)
if command -v gnome-terminal &> /dev/null; then
    gnome-terminal --title="ΩmegA AI Assistant" --geometry=120x40 -- bash -c "cd '$SCRIPT_DIR' && ./target/release/omega_rust --config capabilities.toml; exec bash"
elif command -v xfce4-terminal &> /dev/null; then
    xfce4-terminal --title="ΩmegA AI Assistant" --geometry=120x40 -e "bash -c 'cd $SCRIPT_DIR && ./target/release/omega_rust --config capabilities.toml; exec bash'"
elif command -v konsole &> /dev/null; then
    konsole --title "ΩmegA AI Assistant" -e bash -c "cd '$SCRIPT_DIR' && ./target/release/omega_rust --config capabilities.toml; exec bash"
elif command -v xterm &> /dev/null; then
    xterm -title "ΩmegA AI Assistant" -geometry 120x40 -e "cd '$SCRIPT_DIR' && ./target/release/omega_rust --config capabilities.toml; exec bash"
else
    # Fallback: just run in current terminal
    cd "$SCRIPT_DIR"
    ./target/release/omega_rust --config capabilities.toml
fi
AUTOSTART

chmod +x "$SCRIPT_DIR/autostart-omega.sh"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "                    ✨ SETUP COMPLETE! ✨"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🎉 Everything is configured!"
echo ""
echo "What happens now:"
echo ""
echo "  1️⃣  Next time you LOG IN to your laptop"
echo "     → Terminal will automatically open"
echo "     → Ollama will automatically start"
echo "     → ΩmegA will be running and ready!"
echo ""
echo "  2️⃣  Want to test it NOW without rebooting?"
echo "     Just run:"
echo "     ./autostart-omega.sh"
echo ""
echo "  3️⃣  Or test the omega command:"
echo "     omega"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Press Enter to test ΩmegA now, or Ctrl+C to exit..."
read -r

# Test launch
echo ""
echo "🚀 Testing ΩmegA launch..."
sleep 1
./target/release/omega_rust --config capabilities.toml
