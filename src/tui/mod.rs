//! Terminal UI harness.
//!
//! This module wires the application state machine and rendering logic
//! together. It creates a ratatui `Terminal` backed by a crossterm
//! backend, spawns an event reader that streams key presses into an
//! MPSC channel, and polls both user input and engine events to
//! update the [`App`](crate::tui::app::App). When the user quits
//! (e.g. by pressing Ctrl-C) the terminal is restored to its normal
//! state.

pub mod app;
pub mod view;

use app::{App, UiLayout};
use crate::events::UiEvent;
use crate::engine::OmegaEngine;
use futures::StreamExt;
use ratatui::Terminal;
use ratatui::backend::CrosstermBackend;
use crossterm::{
    self,
    event::{Event as CEvent, EventStream},
    terminal::{enable_raw_mode, disable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
    event::{DisableMouseCapture, EnableMouseCapture},
    execute,
};
use tokio::sync::mpsc::unbounded_channel;

/// Run the terminal UI. This function takes ownership of an
/// `OmegaEngine` and drives the application until the user exits. On
/// exit the terminal state is restored.
pub async fn run(engine: OmegaEngine) -> Result<(), Box<dyn std::error::Error>> {
    run_with_layout(engine, UiLayout::Tui).await
}

pub async fn run_with_layout(engine: OmegaEngine, layout: UiLayout) -> Result<(), Box<dyn std::error::Error>> {
    // Put the terminal into raw mode and switch to the alternate screen
    enable_raw_mode()?;
    let mut stdout = std::io::stdout();
    execute!(
        stdout,
        EnterAlternateScreen,
        EnableMouseCapture
    )?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;
    terminal.clear()?;

    // Channel receiving UiEvents from the engine
    let (ui_tx, mut ui_rx) = unbounded_channel::<UiEvent>();

    // Channel receiving raw crossterm events (keys, resize, etc.)
    let (event_tx, mut event_rx) = unbounded_channel::<CEvent>();

    // Spawn a task to read crossterm events asynchronously
    let event_tx_clone = event_tx.clone();
    tokio::spawn(async move {
        let mut reader = EventStream::new();
        while let Some(Ok(evt)) = reader.next().await {
            event_tx_clone.send(evt).ok();
        }
    });

    // Initialise application state
    let mut app = App::new(engine.get_config().profile.clone(), layout);
    app.agents = engine.get_agent_info();

    // Main event loop
    loop {
        // Draw UI
        terminal.draw(|f| view::ui(f, &mut app))?;

        // Advance spinner and diagnostics pulse
        app.spinner_index = app.spinner_index.wrapping_add(1);
        app.on_tick();

        // Poll events from the crossterm stream and UI event channel
        tokio::select! {
            maybe_evt = event_rx.recv() => {
                if let Some(evt) = maybe_evt {
                    use crossterm::event::Event as InputEvent;
                    match evt {
                        InputEvent::Key(key_event) => {
                            if app.on_key(key_event, &ui_tx, &engine) {
                                break;
                            }
                        }
                        _ => {}
                    }
                } else {
                    break;
                }
            },
            Some(ui_evt) = ui_rx.recv() => {
                app.on_ui_event(ui_evt);
            },
            _ = tokio::time::sleep(std::time::Duration::from_millis(500)) => {
                // Periodically update device list from engine
                let devices = engine.devices.get_all();
                let _ = ui_tx.send(UiEvent::Devices(devices));
            },
        }
    }

    // Restore terminal state
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    Ok(())
}
