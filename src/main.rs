//! Entry point for ΩmegA.
//!
//! The executable parses command line arguments, loads the capability
//! manifest, initialises the core engine, and launches either the TUI
//! or a fallback CLI. The TUI is enabled by default when the
//! `tui` feature is present.

mod config;
mod events;
mod engine;
mod ui;
mod server;
mod modules;
mod devices;

// Only compile the `tui` module when the feature is enabled
#[cfg(feature = "tui")]
mod tui;

use clap::Parser;
use config::load_config;
use engine::OmegaEngine;
use events::UiEvent;

/// ΩmegA orchestrator CLI
#[derive(Parser)]
#[command(author, version, about = "ΩmegA multi-agent orchestrator")]
struct Cli {
    /// Run in plain CLI mode (no TUI)
    #[arg(long, default_value_t = false)]
    cli: bool,
    /// Run in Server API mode
    #[arg(long, default_value_t = false)]
    server: bool,
    /// Port for Server API
    #[arg(long, default_value_t = 8080)]
    port: u16,
    /// Path to a TOML capability manifest
    #[arg(long)]
    config: Option<String>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Parse arguments
    let cli = Cli::parse();

    // Determine operating mode
    if cli.server {
        server::run_server(cli.port).await?;
    } else if cli.cli {
        // Load configuration
        let config = load_config(cli.config.as_deref());
        // Initialise core engine
        let engine = OmegaEngine::new(config);
        run_cli(engine).await?;
    } else {
        // Load configuration
        let config = load_config(cli.config.as_deref());
        // Initialise core engine
        let engine = OmegaEngine::new(config);
        // Default to TUI when available
        #[cfg(feature = "tui")]
        {
            tui::run(engine).await?;
        }
        #[cfg(not(feature = "tui"))]
        {
            eprintln!("TUI support is not compiled in. Run with --cli or build with the 'tui' feature.");
        }
    }
    Ok(())
}

/// Fallback CLI. This mode uses rustyline for input and prints
/// responses directly to the terminal. It is useful when running in
/// environments where a full TUI is not available.
async fn run_cli(engine: OmegaEngine) -> Result<(), Box<dyn std::error::Error>> {
    use rustyline::DefaultEditor;
    use ui::*;

    print_banner();

    let mut rl = DefaultEditor::new()?;
    println!();
    println!("ΩmegA CLI mode. Type 'exit' or 'quit' to exit, or 'help' for commands.");
    println!();

    loop {
        let prompt = get_prompt();
        let readline = rl.readline(&prompt);

        match readline {
            Ok(line) => {
                let trimmed = line.trim();

                if trimmed.is_empty() {
                    continue;
                }

                rl.add_history_entry(trimmed).ok();

                match trimmed {
                    "exit" | "quit" => {
                        print_shutdown();
                        break;
                    }
                    "help" => {
                        print_help();
                    }
                    "status" => {
                        println!("{}", ui::ViceColors::cyan("Status: Ready"));
                    }
                    "agents" | "rollcall" | "roster" => {
                        let agents = engine.get_agent_info();
                        let agent_data: Vec<(String, String, String)> = agents.iter()
                            .map(|a| (a.name.clone(), a.role.clone(), format!("{}", a.status)))
                            .collect();
                        ui::print_agents_roster(&agent_data);
                    }
                    input if input.starts_with('/') => {
                        println!("Slash commands are only available in the TUI. Use --help for CLI commands.");
                    }
                    input => {
                        // Create a channel to receive events from the engine
                        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
                        engine.process_input(input.to_string(), true, tx);

                        // Collect and print events
                        while let Some(evt) = rx.recv().await {
                            match evt {
                                UiEvent::Output(text) => {
                                    println!();
                                    println!("{}", ui::ViceColors::cyan(&text));
                                    println!();
                                }
                                UiEvent::StreamUpdate(chunk) => {
                                    print!("{}", chunk);
                                    use std::io::{self, Write};
                                    io::stdout().flush().unwrap();
                                }
                                UiEvent::Summary { latency_ms, tokens, phases } => {
                                    println!();
                                    println!();
                                    let summary = format!(
                                        "done in {}ms | tokens: {} | phases: {}",
                                        latency_ms,
                                        tokens.map(|t| t.to_string()).unwrap_or_else(|| "?".to_string()),
                                        phases.join(", ")
                                    );
                                    println!("{}", ui::ViceColors::neon_green(&summary));
                                    println!();
                                }
                                UiEvent::Status(_) => {}
                                UiEvent::Agents(_) => {}
                                UiEvent::Metrics(_) => {}
                                UiEvent::Devices(_) => {}
                                UiEvent::Trace(_) => {}
                            }
                        }
                    }
                }
            }
            Err(rustyline::error::ReadlineError::Interrupted) => {
                continue;
            }
            Err(rustyline::error::ReadlineError::Eof) => {
                print_shutdown();
                break;
            }
            Err(err) => {
                print_error(&format!("Readline error: {:?}", err));
                break;
            }
        }
    }

    Ok(())
}
