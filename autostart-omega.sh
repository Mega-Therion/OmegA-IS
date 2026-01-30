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
