#!/bin/bash

echo "🚀 Installing Omega CLI..."

# Source cargo environment
source "$HOME/.cargo/env"

# Build in release mode
cargo build --release

# Copy to local bin
mkdir -p ~/.local/bin
cp target/release/omega_rust ~/.local/bin/omega

# Make executable
chmod +x ~/.local/bin/omega

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo ""
    echo "⚠️  Warning: ~/.local/bin is not in your PATH"
    echo "Add this line to your ~/.bashrc or ~/.zshrc:"
    echo ""
    echo "export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
fi

echo ""
echo "✅ Omega installed successfully!"
echo ""
echo "Usage:"
echo "  omega                    # Start interactive mode"
echo "  omega run \"mission\"      # Run a single mission"
echo "  omega status             # Check system status"
echo "  omega --help             # Show all commands"
echo ""
