//! Entry point for ΩmegA.
//!
//! The executable parses command line arguments, loads the capability
//! manifest, initialises the core engine, and launches either the TUI
//! or a fallback CLI. The TUI is enabled by default when the
//! `tui` feature is present.

mod cloud;
mod config;
mod devices;
mod dna;
mod ear;
mod engine;
mod events;
mod evol;
mod hass;
mod jobs;
mod modules;
mod revenue;
mod server;
mod ui;
mod voice;

// Only compile the `tui` module when the feature is enabled
#[cfg(feature = "tui")]
mod tui;

use clap::Parser;
use config::load_config;
use engine::OmegaEngine;
use events::{StatusState, UiEvent};

/// ΩmegA orchestrator CLI
#[derive(Parser)]
#[command(author, version, about = "ΩmegA multi-agent orchestrator")]
struct Cli {
    /// Run in plain CLI mode (no TUI)
    #[arg(long, default_value_t = false)]
    cli: bool,
    /// Read input lines from stdin (non-interactive)
    #[arg(long, default_value_t = false)]
    stdin: bool,
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
        if cli.stdin {
            run_cli_stdin(engine).await?;
        } else {
            #[cfg(feature = "tui")]
            {
                tui::run_with_layout(engine, tui::app::UiLayout::Cli).await?;
            }
            #[cfg(not(feature = "tui"))]
            {
                run_cli(engine).await?;
            }
        }
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
            eprintln!(
                "TUI support is not compiled in. Run with --cli or build with the 'tui' feature."
            );
        }
    }
    Ok(())
}

/// Fallback CLI. This mode uses rustyline for input and prints
/// responses directly to the terminal. It is useful when running in
/// environments where a full TUI is not available.
async fn run_cli(engine: OmegaEngine) -> Result<(), Box<dyn std::error::Error>> {
    use rustyline::DefaultEditor;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;
    use ui::*;

    print_banner();

    let mut rl = DefaultEditor::new()?;
    let thinking_active = Arc::new(AtomicBool::new(false));
    let thinking_running = Arc::new(AtomicBool::new(false));
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
                        let agent_data: Vec<(String, String, String)> = agents
                            .iter()
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
                                UiEvent::Summary {
                                    latency_ms,
                                    tokens,
                                    phases,
                                } => {
                                    println!();
                                    println!();
                                    let summary = format!(
                                        "done in {}ms | tokens: {} | phases: {}",
                                        latency_ms,
                                        tokens
                                            .map(|t| t.to_string())
                                            .unwrap_or_else(|| "?".to_string()),
                                        phases.join(", ")
                                    );
                                    println!("{}", ui::ViceColors::neon_green(&summary));
                                    println!();
                                }
                                UiEvent::Status(state) => {
                                    let active = matches!(
                                        state,
                                        StatusState::Working | StatusState::Synthesising
                                    );
                                    thinking_active.store(active, Ordering::Relaxed);
                                    if active && !thinking_running.load(Ordering::Relaxed) {
                                        let active_flag = thinking_active.clone();
                                        let running_flag = thinking_running.clone();
                                        running_flag.store(true, Ordering::Relaxed);
                                        tokio::spawn(async move {
                                            let text = "ω synthesizing …";
                                            let chars: Vec<char> = text.chars().collect();
                                            let mut idx = 0usize;
                                            while active_flag.load(Ordering::Relaxed) {
                                                let mut line = String::new();
                                                for (i, ch) in chars.iter().enumerate() {
                                                    if i == idx {
                                                        line.push_str(&format!(
                                                            "\x1b[1;36m{}\x1b[0m",
                                                            ch
                                                        ));
                                                    } else if i + 1 == idx || idx + 1 == i {
                                                        line.push_str(&format!(
                                                            "\x1b[36m{}\x1b[0m",
                                                            ch
                                                        ));
                                                    } else {
                                                        line.push_str(&format!(
                                                            "\x1b[90m{}\x1b[0m",
                                                            ch
                                                        ));
                                                    }
                                                }
                                                print!("\r\x1b[2K{}", line);
                                                use std::io::{self, Write};
                                                io::stdout().flush().ok();
                                                idx = (idx + 1) % chars.len().max(1);
                                                tokio::time::sleep(
                                                    std::time::Duration::from_millis(140),
                                                )
                                                .await;
                                            }
                                            print!("\r\x1b[2K");
                                            use std::io::{self, Write};
                                            io::stdout().flush().ok();
                                            running_flag.store(false, Ordering::Relaxed);
                                        });
                                    }
                                }
                                UiEvent::Agents(_) => {}
                                UiEvent::Metrics(_) => {}
                                UiEvent::Devices(_) => {}
                                UiEvent::Trace(_) => {}
                                UiEvent::DispatchPrompt { summary, .. } => {
                                    if !summary.is_empty() {
                                        ui::print_dispatch_prompt(&summary);
                                    }
                                }
                                UiEvent::TaskUpdate(update) => {
                                    let status = match update.status {
                                        crate::events::TaskStatus::Pending => "PENDING",
                                        crate::events::TaskStatus::Running => "RUNNING",
                                        crate::events::TaskStatus::Done => "DONE",
                                        crate::events::TaskStatus::Failed => "FAILED",
                                    };
                                    ui::print_task_update(&update.name, status, &update.detail);
                                }
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

/// Non-interactive CLI that reads lines from stdin.
async fn run_cli_stdin(engine: OmegaEngine) -> Result<(), Box<dyn std::error::Error>> {
    use std::io::{self, BufRead};
    use ui::*;

    print_banner();
    println!();
    println!("ΩmegA CLI stdin mode. Reading lines from stdin.");
    println!();

    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = line?;
        let trimmed = line.trim().to_string();
        if trimmed.is_empty() {
            continue;
        }
        match trimmed.as_str() {
            "exit" | "quit" => {
                print_shutdown();
                break;
            }
            "help" => {
                print_help();
                continue;
            }
            "status" => {
                println!("{}", ui::ViceColors::cyan("Status: Ready"));
                continue;
            }
            "agents" | "rollcall" | "roster" => {
                let agents = engine.get_agent_info();
                let agent_data: Vec<(String, String, String)> = agents
                    .iter()
                    .map(|a| (a.name.clone(), a.role.clone(), format!("{}", a.status)))
                    .collect();
                ui::print_agents_roster(&agent_data);
                continue;
            }
            input if input.starts_with('/') => {
                println!("Slash commands are only available in the TUI.");
                continue;
            }
            _ => {}
        }

        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        engine.process_input(trimmed.clone(), true, tx);

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
                UiEvent::Summary {
                    latency_ms,
                    tokens,
                    phases,
                } => {
                    println!();
                    println!();
                    let summary = format!(
                        "done in {}ms | tokens: {} | phases: {}",
                        latency_ms,
                        tokens
                            .map(|t| t.to_string())
                            .unwrap_or_else(|| "?".to_string()),
                        phases.join(", ")
                    );
                    println!("{}", ui::ViceColors::neon_green(&summary));
                    println!();
                    break;
                }
                UiEvent::Status(_) => {}
                UiEvent::Agents(_) => {}
                UiEvent::Metrics(_) => {}
                UiEvent::Devices(_) => {}
                UiEvent::Trace(_) => {}
                UiEvent::DispatchPrompt { .. } => {}
                UiEvent::TaskUpdate(_) => {}
            }
        }
    }

    Ok(())
}
