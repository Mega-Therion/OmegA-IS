#!/bin/bash
# Quick test script for omega
echo "Testing Ollama connection..."
curl -s http://localhost:11434/api/generate -d '{"model":"qwen2.5-coder:1.5b","prompt":"Say hello","stream":false}' | grep -o '"response":"[^"]*"' | head -1

echo ""
echo "Testing omega CLI mode..."
echo "test" | timeout 3 ./target/release/omega_rust --cli 2>&1 | tail -20
