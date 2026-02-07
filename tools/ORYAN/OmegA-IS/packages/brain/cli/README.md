# OMEGA CLI

Command line interface for interacting with your OmegAI Brain.

## Installation

### Global Install
```bash
npm install -g @omega/cli
```

### Local Install
```bash
cd cli
npm link
```

## Usage

### Interactive Mode
```bash
omega
```
Starts an interactive session where you can chat directly.

### Quick Commands
```bash
# Chat with an agent
omega chat "What is the status of project Omega?"

# Check system status
omega status

# List available agents
omega agents

# Manage missions
omega mission list

# Show configuration
omega config
```

### Interactive Commands
When in interactive mode, use:
- `/status` - System status
- `/agents` - List agents
- `/mission list` - List missions
- `/config` - Show config
- `exit` - Quit

## Configuration

Configure via environment variables:

```bash
# API endpoint
export OMEGA_API_URL=http://localhost:8080

# Default agent (gemini, claude, codex, grok)
export OMEGA_AGENT=gemini

# Verbose output
export OMEGA_VERBOSE=1
```

## Examples

```bash
# Ask Gemini a question
OMEGA_AGENT=gemini omega chat "Plan the next phase of development"

# Ask Claude for reasoning
OMEGA_AGENT=claude omega chat "Analyze this architecture decision"

# Ask Grok for real-time info
OMEGA_AGENT=grok omega chat "What are the latest AI developments?"
```

## Requirements

- Node.js 18+
- gAIng-Brain server running

## License

MIT
