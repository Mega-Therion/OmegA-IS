#!/bin/bash
# Quick script to change the Ollama model ΩmegA uses

if [ -z "$1" ]; then
    echo "Usage: ./set-model.sh MODEL_NAME"
    echo ""
    echo "Available models on your system:"
    ollama list
    echo ""
    echo "Or download a new one:"
    echo "  ollama pull llama3.2:1b     (fast, small)"
    echo "  ollama pull qwen2.5:1.5b    (good balance)"
    echo "  ollama pull llama3.2:3b     (better quality)"
    exit 1
fi

MODEL="$1"

echo "Setting ΩmegA to use model: $MODEL"

# Update engine.rs
sed -i "s/const MODEL_NAME: &str = \".*\";/const MODEL_NAME: &str = \"$MODEL\";/" src/engine.rs
sed -i "s/const CHAT_MODEL: &str = \".*\";/const CHAT_MODEL: &str = \"$MODEL\";/" src/engine.rs

echo "✅ Updated! Now rebuilding..."
cargo build --release

echo "✅ Installing..."
cp target/release/omega_rust ~/.local/bin/omega

echo ""
echo "✅ Done! ΩmegA now uses: $MODEL"
echo "Test it: omega"
