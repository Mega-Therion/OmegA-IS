#!/bin/bash
# ΩmegA Autostart Script
# This runs when you log in

# Wait a moment for system to fully load
sleep 3

# Start Ollama if not running (prefer user systemd if present)
if ! pgrep -x "ollama" > /dev/null; then
    if command -v systemctl &> /dev/null; then
        systemctl --user start ollama.service 2>/dev/null || true
    fi
    if ! pgrep -x "ollama" > /dev/null; then
        nohup ollama serve > ~/.omega_ollama.log 2>&1 &
    fi
fi

# Wait for Ollama API to be ready
for _ in {1..30}; do
    if curl -fsS http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Start ΩmegA server if not running
if ! pgrep -f "omega_rust --server" > /dev/null; then
    nohup ./target/release/omega_rust --server --config capabilities.toml > ~/.omega_server.log 2>&1 &
fi

# Wait for ΩmegA server health endpoint
for _ in {1..30}; do
    if curl -fsS http://127.0.0.1:8080/health > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Launch terminal with ΩmegA
# Try different terminal emulators (gnome-terminal, xfce4-terminal, konsole, etc.)
if command -v gnome-terminal &> /dev/null; then
    gnome-terminal --title="ΩmegA AI Assistant" --geometry=120x40 -- bash -c "cd '$SCRIPT_DIR' && ./target/release/omega_rust --cli --config capabilities.toml; exec bash"
elif command -v xfce4-terminal &> /dev/null; then
    xfce4-terminal --title="ΩmegA AI Assistant" --geometry=120x40 -e "bash -c 'cd $SCRIPT_DIR && ./target/release/omega_rust --cli --config capabilities.toml; exec bash'"
elif command -v konsole &> /dev/null; then
    konsole --title "ΩmegA AI Assistant" -e bash -c "cd '$SCRIPT_DIR' && ./target/release/omega_rust --cli --config capabilities.toml; exec bash"
elif command -v xterm &> /dev/null; then
    xterm -title "ΩmegA AI Assistant" -geometry 120x40 -e "cd '$SCRIPT_DIR' && ./target/release/omega_rust --cli --config capabilities.toml; exec bash"
else
    # Fallback: just run in current terminal
    cd "$SCRIPT_DIR"
    ./target/release/omega_rust --cli --config capabilities.toml
fi
