#!/bin/bash
# ΩmegA Auto-Start Script
# This script starts Ollama service and launches ΩmegA TUI

echo "🚀 Starting ΩmegA..."

# Check if Ollama is already running
if pgrep -x "ollama" > /dev/null; then
    echo "✅ Ollama is already running"
else
    echo "🔧 Starting Ollama service..."
    # Start ollama serve in the background, redirect output to log
    nohup ollama serve > ~/.omega_ollama.log 2>&1 &
    # Give it a moment to start
    sleep 2
    echo "✅ Ollama started"
fi

# Change to omega_rust directory and run
cd ~/omega_rust
echo "🎨 Launching ΩmegA TUI..."
echo ""

# Run omega (either from PATH or via cargo)
if command -v omega &> /dev/null; then
    omega
else
    cargo run
fi
