#!/bin/bash
# ΩmegA Global Launcher
# This script can be installed to ~/.local/bin/omega to run ΩmegA from anywhere

# Store the directory where user called omega from
export OMEGA_WORK_DIR="$(pwd)"

# Change to omega_rust installation directory
cd ~/omega_rust

# Run the omega binary with full filesystem access enabled
exec ./target/release/omega_rust --config capabilities.toml "$@"
