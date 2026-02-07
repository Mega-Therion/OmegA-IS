#!/bin/bash

echo "🌴 OMEGA UI Demo - Miami Vice / Cyberpunk Theme 🌆"
echo ""
echo "This demo will showcase all the beautiful UI elements!"
echo ""
echo "Press Enter to continue..."
read

clear

echo "1️⃣  Showing the epic banner..."
sleep 1
~/.local/bin/omega status

echo ""
echo "Press Enter to see interactive mode..."
read

clear

echo "2️⃣  Here's what interactive mode looks like..."
echo ""
echo "Note: The colors are:"
echo "  - HOT PINK prompt (omega▸)"
echo "  - CYAN borders and text"
echo "  - PURPLE decorative lines"
echo "  - YELLOW commands"
echo "  - NEON GREEN success messages"
echo ""
echo "Try running: omega"
echo ""
echo "Commands to try in interactive mode:"
echo "  • status     (shows system health)"
echo "  • help       (shows all commands)"
echo "  • <mission>  (execute any mission)"
echo "  • exit       (quit)"
echo ""
echo "Press Enter to see a quick mission demo..."
read

clear

echo "3️⃣  Running a quick mission to show the UI flow..."
echo ""
~/.local/bin/omega run "Create a hello function in Python"

echo ""
echo ""
echo "✨ That's the OMEGA UI experience! ✨"
echo ""
echo "Key visual elements you saw:"
echo "  🎨 Rainbow gradient ASCII logo (Magenta→Pink→Purple→Yellow→Orange)"
echo "  ⚡ Miami Vice color palette throughout"
echo "  🌆 Cyberpunk geometric patterns and icons"
echo "  💎 Box borders and grid lines"
echo "  🎯 Color-coded agent states"
echo "  ✓  Neon green success indicators"
echo ""
echo "To use Omega:"
echo "  omega              # Interactive mode"
echo "  omega status       # Check system"
echo "  omega run \"task\"   # Single mission"
echo ""
