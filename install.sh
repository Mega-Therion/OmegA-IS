#!/bin/bash
# ΩmegΑ Sovereign Intelligence - One-Click Setup
# For guests and secondary pilots.

echo "--- ⌬ ΩmegΑ SOVEREIGN SETUP ⌬ ---"

# 1. Check for Rust
if ! command -v cargo &> /dev/null; then
    echo "[...] Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
else
    echo "[✓] Rust is already installed."
fi

# 2. Check for Ollama
if ! command -v ollama &> /dev/null; then
    echo "[...] Installing Ollama (Local Brain)..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo "[✓] Ollama is already installed."
fi

# 3. Pull Required Models
echo "[...] Provisioning neural models..."
ollama pull qwen2.5-coder:1.5b
ollama pull llama3.2:3b

# 4. Build ΩmegΑ
echo "[...] Building the Sovereign Engine..."
cargo build --release

# 5. Finalize
echo "--- SETUP COMPLETE ---"
echo "To enter the cockpit, run: ./target/release/omega_rust"
echo "For server mode, run: ./target/release/omega_rust --server"