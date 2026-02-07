#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Launch terminal with Omega CLI
if command -v gnome-terminal &> /dev/null; then
    gnome-terminal --title="OmegA AI Assistant" --geometry=120x40 -- bash -c "cd '$SCRIPT_DIR' && ./target/release/omega_rust --cli --config capabilities.toml; exec bash"
elif command -v xfce4-terminal &> /dev/null; then
    xfce4-terminal --title="OmegA AI Assistant" --geometry=120x40 -e "bash -c 'cd $SCRIPT_DIR && ./target/release/omega_rust --cli --config capabilities.toml; exec bash'"
elif command -v konsole &> /dev/null; then
    konsole --title "OmegA AI Assistant" -e bash -c "cd '$SCRIPT_DIR' && ./target/release/omega_rust --cli --config capabilities.toml; exec bash"
elif command -v xterm &> /dev/null; then
    xterm -title "OmegA AI Assistant" -geometry 120x40 -e "cd '$SCRIPT_DIR' && ./target/release/omega_rust --cli --config capabilities.toml; exec bash"
else
    ./target/release/omega_rust --cli --config capabilities.toml
fi
