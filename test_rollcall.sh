#!/bin/bash

echo "🎯 Testing the Roll Call Fix"
echo ""
echo "Testing various ways to ask about agents..."
echo ""

echo "1️⃣  Testing: 'agents' command"
echo "omega▸ agents"
echo ""
~/.local/bin/omega run "agents"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "2️⃣  Testing: 'What's up gAIng? Roll call!' (your original question)"
echo ""
~/.local/bin/omega run "What's up gAIng? Can I get a roll call real quick just so I can see who all we got at this party?"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✅ Roll call fix tested!"
echo ""
echo "Now in interactive mode, you can also type:"
echo "  • agents"
echo "  • rollcall"
echo "  • roster"
echo "  • who"
echo ""
echo "To see the agent roster!"
