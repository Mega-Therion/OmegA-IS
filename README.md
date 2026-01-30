# 🚀 ΩmegA - Multi-Agent AI System

A powerful Rust-based orchestrator with a modern terminal UI (TUI) that coordinates multiple AI agents to solve complex tasks using your local Ollama models.

## Features

- 🖥️ **Modern TUI**: Beautiful terminal interface built with Ratatui
- 🤖 **Multi-Agent System**: Alpha (Researcher) and Beta (Coder) agents work together
- 💬 **Dual Modes**: TUI mode (default) or CLI fallback mode
- 🎨 **Miami Vice Theme**: Synthwave/cyberpunk color palette with status indicators (α/ω/Σ)
- 🔄 **Real-time Streaming**: Watch AI think with token-by-token streaming
- 💾 **Export Results**: Save messages to files with `/export` command
- 📊 **Mission Metrics**: Latency, token count, and execution phase tracking
- ⚡ **Fast & Efficient**: Built in Rust for maximum performance
- 🔌 **Local AI**: Uses Ollama for complete privacy and control
- 🎛️ **Feature Flags**: Operator, Developer, and Public build editions
- 🛡️ **Capability Manifest**: Runtime configuration to gate features

## Installation

### Prerequisites

- Rust (install from https://rustup.rs)
- Ollama (install from https://ollama.ai)
- A downloaded model (e.g., `ollama pull qwen2.5-coder:1.5b`)

### Quick Install

```bash
cd omega_rust
chmod +x install.sh
./install.sh
```

This will build Omega in release mode and install it to `~/.local/bin/omega`.

### Manual Build

```bash
cargo build --release
```

The binary will be at `target/release/omega_rust`.

## Build Editions

ΩmegA supports multiple build configurations via Cargo features:

### Operator Edition (Default)
Full private capability with TUI enabled:
```bash
cargo run
# or
cargo build --release
```

### Developer Edition
Includes debug trace pane, metrics, and inspector views:
```bash
cargo run --features dev
```

### Public Edition
Minimal persona-only chat for web demos:
```bash
cargo run --features public
```

### CLI-Only Build
Disable TUI for headless or minimal environments:
```bash
cargo run --no-default-features --features operator -- --cli
```

## Usage

### TUI Mode (Default)

Launch the modern terminal user interface:

```bash
omega
# or
cargo run
```

The TUI provides a rich, interactive experience with:
- **Header**: ΩmegA branding with animated spinner and status indicator
- **Left Pane**: Agent roster with individual status symbols
- **Center Pane**: Chat-style conversation with color-coded messages
- **Right Pane**: Debug trace (visible only with `--features dev`)
- **Input Bar**: Command input with slash command autocomplete hints

#### TUI Status Indicators
- **α** (alpha) - System ready for input
- **ω** (omega) - Working/thinking
- **Σ** (sigma) - Synthesizing final results

#### TUI Keyboard Controls
- **Enter** - Submit input or command
- **Ctrl-C** - Exit the application
- **Up/Down Arrows** - Scroll the output pane
- **Backspace** - Delete last character

#### TUI Slash Commands
- `/help` - Show available commands
- `/status` - Display current system status
- `/agents` - List all agents and their statuses
- `/stream on|off` - Toggle real-time streaming mode
- `/mode focus|ops|showcase` - Change display layout
- `/export last` - Save last assistant message to `last_message.txt`
- `/quit` - Display quit hint (use Ctrl-C to exit)

### CLI Mode (Fallback)

For environments where TUI is not available:

```bash
omega --cli
# or
cargo run -- --cli
```

In CLI mode, you can:
- Type missions directly
- Use `status` to check system health
- Use `help` for available commands
- Use `exit` or `quit` to leave

Example session:
```
omega▸ Write a Python function to calculate factorial
[Mission executes with streaming output...]

omega▸ Create a REST API endpoint in Express.js
[Mission executes...]

omega▸ exit
```

### Run Single Mission

Execute a one-off mission:

```bash
omega run "Create a sorting algorithm in Python"
```

Save output to file:

```bash
omega run "Write a web scraper" --output scraper.txt
```

### Check System Status

```bash
omega status
```

Shows:
- Current model
- Ollama connection status
- System configuration

### Enable Verbose Mode

For detailed agent output in interactive mode:

```bash
omega interactive --verbose
```

## Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `omega` | Start interactive mode | `omega` |
| `omega run <mission>` | Run a single mission | `omega run "Write hello world"` |
| `omega run <mission> -o <file>` | Run and save to file | `omega run "Create API" -o api.txt` |
| `omega interactive` | Start interactive mode | `omega interactive` |
| `omega interactive -v` | Interactive with verbose | `omega interactive --verbose` |
| `omega status` | Show system status | `omega status` |
| `omega --help` | Show help | `omega --help` |
| `omega --version` | Show version | `omega --version` |

## Architecture

### Module Structure

- **config.rs** - Capability manifest loader (TOML parsing)
- **events.rs** - UI event definitions (Output, StreamUpdate, Summary, Status, Agents, Trace)
- **engine.rs** - Core orchestrator with OmegaBrain, Agent, and Orchestrator
- **ui.rs** - Terminal rendering for CLI fallback mode (Miami Vice theme)
- **tui/mod.rs** - TUI harness with async event loop (Ratatui + Crossterm)
- **tui/app.rs** - Application state machine and command handling
- **tui/view.rs** - Rendering functions for panels and widgets

### The Brain (OmegaBrain)
HTTP client that communicates with Ollama API:
- Non-streaming requests (`think()`)
- Streaming responses (`think_stream()`)
- Health checks

### The Agents
- **Alpha (Researcher)**: Analyzes concepts, provides context and explanations
- **Beta (Coder)**: Implements solutions, writes clean code

### The Orchestrator
Coordinates agents and manages execution:
1. Receives user input via channels
2. Creates execution plan
3. Dispatches tasks to agents
4. Synthesizes final results
5. Emits UiEvents for display

### Event Flow

1. **User Input** → Engine receives mission
2. **Status: Working (ω)** → Planning phase begins
3. **Agent Execution** → Each agent processes their task
4. **Status: Synthesizing (Σ)** → Combining results
5. **Status: Ready (α)** → Mission complete, display summary

### Mission Flow

1. **Planning**: Orchestrator analyzes mission and creates task breakdown
2. **Execution**: Each agent performs their specialized role (with streaming)
3. **Synthesis**: Orchestrator combines agent outputs into final result
4. **Summary**: Display metrics (latency, tokens, phases)

## Configuration

### Capability Manifest

Create or edit `capabilities.toml` to control runtime features:

```toml
allow_network = true     # permit network requests (Ollama API)
allow_filesystem = false # disallow reading arbitrary files
max_parallel_agents = 3  # maximum number of concurrent agents
```

Load a custom config:
```bash
omega --config capabilities.toml
# or
cargo run -- --config /path/to/config.toml
```

### Model and Endpoint

Edit `src/engine.rs` to customize:

```rust
const MODEL_NAME: &str = "qwen2.5-coder:1.5b";  // Change model
const OLLAMA_URL: &str = "http://localhost:11434/api/generate";  // Change URL
```

### Adding More Agents

```rust
omega.register_agent(Agent::new(
    "Gamma",
    "Tester",
    "You write comprehensive tests for code."
));
```

## Examples

### Example 1: Code Generation
```bash
omega run "Create a binary search tree in Rust"
```

### Example 2: Algorithm Explanation
```bash
omega run "Explain how quicksort works with code examples"
```

### Example 3: Web Development
```bash
omega run "Build a todo list component in React" -o todo.jsx
```

### Example 4: Data Processing
```bash
omega run "Write a Python script to parse CSV and generate reports"
```

## History & Logs

Missions are automatically logged to `.omega_history.txt` in interactive mode with:
- Mission number
- Timestamp
- Query
- Result

## Troubleshooting

### "Connection Offline"
- Ensure Ollama is running: `ollama serve`
- Check if model is available: `ollama list`

### "Model not found"
- Pull the model: `ollama pull qwen2.5-coder:1.5b`

### "Out of memory"
- Try a smaller model: `ollama pull qwen2.5-coder:1.5b`
- Close other applications

### Slow responses
- Smaller models are faster
- Check CPU usage
- Consider using GPU if available

## Performance Tips

1. **Use smaller models** for faster responses (1.5b vs 7b)
2. **Run in release mode** for optimized performance
3. **Keep Ollama running** to avoid startup delays
4. **Use verbose mode** only when debugging

## Development

### Build for development
```bash
cargo build
```

### Run tests
```bash
cargo test
```

### Format code
```bash
cargo fmt
```

### Check for issues
```bash
cargo clippy
```

## License

MIT License - Feel free to use and modify!

## Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Roadmap

- [ ] Custom agent creation via CLI
- [ ] Web interface
- [ ] Plugin system
- [ ] Multi-model support
- [ ] Team collaboration features
- [ ] Result caching
- [ ] Streaming responses

## Credits

Built with:
- **Rust** 🦀 - Systems programming language
- **Tokio** - Async runtime
- **Ratatui** - Terminal UI framework
- **Crossterm** - Cross-platform terminal manipulation
- **Clap** - CLI parsing
- **Colored** - Terminal colors (CLI mode)
- **Rustyline** - Line editor (CLI mode)
- **Ollama** - Local AI inference

## Color Palette

Miami Vice / Synthwave theme:
- **Hot Pink** (#FF6EC7) - Accents, prompts, user messages
- **Cyan** (#00D9FF) - Text, borders, agent statuses
- **Purple** (#BD00FF) - Headers, decorations
- **Yellow** (#FFD700) - User input highlighting
- **Neon Green** (#39FF14) - Success states, completions
- **Magenta** (#FF00FF) - Branding, ΩmegA logo
- **Orange** (#FFA500) - Highlights, warnings

---

**Made with ❤️ by the Omega Team**
