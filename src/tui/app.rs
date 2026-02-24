//! Application state and event handling for the TUI.
use crate::config::UserProfile;
use crate::devices::PhysicalEntity;
use crate::engine::OmegaEngine;
use crate::events::{AgentInfo, StatusState, SystemMetrics, TaskStatus, TaskUpdate, UiEvent};
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use std::fmt;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::PathBuf;
use tokio::sync::mpsc::UnboundedSender;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UiLayout {
    Tui,
    Cli,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    Focus,
    Ops,
    Showcase,
}

impl fmt::Display for Mode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Mode::Focus => write!(f, "FOCUS"),
            Mode::Ops => write!(f, "OPERATIONS"),
            Mode::Showcase => write!(f, "SHOWCASE"),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Message {
    pub text: String,
    pub from_user: bool,
}

#[derive(Debug, Clone)]
pub struct TaskCard {
    pub id: String,
    pub name: String,
    pub status: TaskStatus,
    pub detail: String,
}

#[derive(Debug, Clone)]
pub struct DispatchPromptUi {
    pub agent_count: usize,
    pub summary: String,
}

pub struct App {
    pub input: String,
    pub messages: Vec<Message>,
    pub agents: Vec<AgentInfo>,
    pub trace: Vec<String>,
    pub status: StatusState,
    pub summary: Option<(u128, Option<usize>, Vec<String>)>,
    pub is_streaming: bool,
    pub mode: Mode,
    pub spinner_index: usize,
    pub scroll: u16,
    pub auto_scroll: bool,
    pub profile: UserProfile,
    pub metrics: SystemMetrics,
    pub entities: Vec<PhysicalEntity>,
    pub tasks: Vec<TaskCard>,
    pub dispatch_prompt: Option<DispatchPromptUi>,
    pub layout: UiLayout,
    pub voice_log_path: PathBuf,
    pub voice_log_pos: u64,
}

impl App {
    pub fn new(profile: UserProfile, layout: UiLayout) -> Self {
        let assistant_name = profile.assistant_name.clone();
        let mut app = Self {
            input: String::new(),
            messages: Vec::new(),
            agents: Vec::new(),
            trace: Vec::new(),
            status: StatusState::Ready,
            summary: None,
            is_streaming: true,
            mode: Mode::Focus,
            spinner_index: 0,
            scroll: 0,
            auto_scroll: true,
            profile,
            metrics: SystemMetrics {
                load: vec![0; 50],
                memory_used: 0.1,
                agent_load: vec![],
            },
            entities: Vec::new(),
            tasks: Vec::new(),
            dispatch_prompt: None,
            layout,
            voice_log_path: PathBuf::from(
                std::env::var("OMEGA_VOICE_LOG")
                    .unwrap_or_else(|_| "/tmp/omega-voice.log".to_string()),
            ),
            voice_log_pos: 0,
        };

        app.messages.push(Message {
            text: format!("Welcome to {}! I'm your AI assistant created by the artistRY.\n\nI can help you brainstorm ideas, answer questions, or execute complex tasks.\n\nJust talk to me naturally - I'll chat with you, and when you need actual work done (like \"create code\" or \"build something\"), I'll dispatch my specialist agents.\n\nType /help for commands, or just start chatting!", assistant_name),
            from_user: false,
        });

        app
    }

    pub fn on_tick(&mut self) {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let new_load = if self.status == StatusState::Working {
            rng.gen_range(5..10)
        } else {
            rng.gen_range(0..3)
        };
        self.metrics.load.remove(0);
        self.metrics.load.push(new_load);
        let jitter = rng.gen_range(-0.01..0.01);
        self.metrics.memory_used = (self.metrics.memory_used + jitter).clamp(0.05, 0.95);

        self.poll_voice_log();
    }

    fn poll_voice_log(&mut self) {
        let Ok(mut file) = File::open(&self.voice_log_path) else {
            return;
        };
        if file.seek(SeekFrom::Start(self.voice_log_pos)).is_err() {
            self.voice_log_pos = 0;
            let _ = file.seek(SeekFrom::Start(0));
        }
        let mut buf = String::new();
        if file.read_to_string(&mut buf).is_err() {
            return;
        }
        if buf.is_empty() {
            return;
        }
        self.voice_log_pos = self.voice_log_pos.saturating_add(buf.len() as u64);
        for line in buf.lines() {
            if let Some(text) = line.strip_prefix("You: ") {
                if !text.trim().is_empty() {
                    self.messages.push(Message {
                        text: text.trim().to_string(),
                        from_user: true,
                    });
                }
            } else if let Some(text) = line.strip_prefix("Omega: ") {
                let cleaned = text.trim();
                if cleaned.is_empty() || cleaned.eq_ignore_ascii_case("thinking...") {
                    continue;
                }
                self.messages.push(Message {
                    text: cleaned.to_string(),
                    from_user: false,
                });
            } else {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                let is_alert = trimmed.starts_with("Warning:")
                    || trimmed.starts_with("Error:")
                    || trimmed.contains("Venv not found")
                    || trimmed.contains("piper not found")
                    || trimmed.contains("Missing deps")
                    || trimmed.contains("unauthenticated requests");
                if is_alert {
                    self.messages.push(Message {
                        text: format!("System: {}", trimmed),
                        from_user: false,
                    });
                }
            }
        }
    }

    pub fn on_ui_event(&mut self, event: UiEvent) {
        match event {
            UiEvent::Output(text) => {
                self.messages.push(Message {
                    text,
                    from_user: false,
                });
                self.summary = None;
            }
            UiEvent::StreamUpdate(token) => {
                if let Some(last) = self.messages.last_mut() {
                    if !last.from_user {
                        last.text.push_str(&token);
                    } else {
                        self.messages.push(Message {
                            text: token,
                            from_user: false,
                        });
                    }
                } else {
                    self.messages.push(Message {
                        text: token,
                        from_user: false,
                    });
                }
            }
            UiEvent::Summary {
                latency_ms,
                tokens,
                phases,
            } => {
                self.summary = Some((latency_ms, tokens, phases));
            }
            UiEvent::Status(state) => {
                self.status = state;
            }
            UiEvent::Agents(list) => {
                self.agents = list;
            }
            UiEvent::Metrics(m) => {
                self.metrics = m;
            }
            UiEvent::Devices(list) => {
                self.entities = list;
            }
            UiEvent::Trace(lines) => {
                self.trace = lines;
            }
            UiEvent::DispatchPrompt {
                agent_count,
                summary,
            } => {
                if agent_count == 0 {
                    self.dispatch_prompt = None;
                } else {
                    self.dispatch_prompt = Some(DispatchPromptUi {
                        agent_count,
                        summary,
                    });
                }
            }
            UiEvent::TaskUpdate(update) => {
                self.upsert_task(update);
            }
        }
    }

    fn upsert_task(&mut self, update: TaskUpdate) {
        if let Some(existing) = self.tasks.iter_mut().find(|t| t.id == update.id) {
            existing.status = update.status;
            existing.detail = update.detail;
            return;
        }
        self.tasks.push(TaskCard {
            id: update.id,
            name: update.name,
            status: update.status,
            detail: update.detail,
        });
        if self.tasks.len() > 8 {
            self.tasks.retain(|t| t.status != TaskStatus::Done);
            if self.tasks.len() > 8 {
                self.tasks.drain(0..(self.tasks.len() - 8));
            }
        }
    }

    pub fn on_key(
        &mut self,
        key: KeyEvent,
        tx_core: &UnboundedSender<UiEvent>,
        engine: &OmegaEngine,
    ) -> bool {
        match key.code {
            KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                return true;
            }
            KeyCode::Enter => {
                let trimmed = self.input.trim().to_string();
                if trimmed.starts_with('/') {
                    self.handle_command(trimmed, tx_core, engine);
                } else if !trimmed.is_empty() {
                    self.messages.push(Message {
                        text: trimmed.clone(),
                        from_user: true,
                    });
                    self.status = StatusState::Working;
                    self.scroll = 0;
                    self.auto_scroll = true;
                    engine.process_input(trimmed, self.is_streaming, tx_core.clone());
                }
                self.input.clear();
            }
            KeyCode::Backspace => {
                self.input.pop();
            }
            KeyCode::Char(c) => {
                self.input.push(c);
            }
            KeyCode::Up => {
                self.auto_scroll = false;
                if self.scroll > 0 {
                    self.scroll -= 1;
                }
            }
            KeyCode::Down => {
                self.scroll = self.scroll.saturating_add(1);
            }
            _ => {}
        }
        false
    }

    fn handle_command(
        &mut self,
        cmd: String,
        _tx_core: &UnboundedSender<UiEvent>,
        _engine: &OmegaEngine,
    ) {
        let parts: Vec<&str> = cmd.split_whitespace().collect();
        match parts.first().map(|s| s.trim_start_matches('/')) {
            Some("help") => {
                self.messages.push(Message {
                    text: "Available: /help, /status, /agents, /stream on|off, /mode focus|ops|showcase, /dispatch yes|no, /jobs, /revenue, /dna, /voice on|off, /listen, /wake on, /devices, /skills, /mcp, /evolve, /quit".to_string(),
                    from_user: false,
                });
            }
            Some("wake") => {
                if let Some(arg) = parts.get(1) {
                    match *arg {
                        "on" => {
                            _engine.start_wake_word_listener(_tx_core.clone());
                            self.messages.push(Message {
                                text: "Background Wake Word listener ENABLED (Keyword: 'Omega').".to_string(),
                                from_user: false,
                            });
                        }
                        _ => {
                            self.messages.push(Message {
                                text: "Usage: /wake on".to_string(),
                                from_user: false,
                            });
                        }
                    }
                } else {
                    self.messages.push(Message {
                        text: "Usage: /wake on".to_string(),
                        from_user: false,
                    });
                }
            }
            Some("dispatch") => {
                if let Some(arg) = parts.get(1) {
                    let value = arg.to_string();
                    _engine.process_input(value, false, _tx_core.clone());
                } else {
                    self.messages.push(Message {
                        text: "Usage: /dispatch yes|no".to_string(),
                        from_user: false,
                    });
                }
            }
            Some("mode") => {
                if let Some(arg) = parts.get(1) {
                    match *arg {
                        "focus" => self.mode = Mode::Focus,
                        "ops" => self.mode = Mode::Ops,
                        "showcase" => self.mode = Mode::Showcase,
                        _ => {}
                    }
                }
            }
            Some("jobs") => {
                let tx = _tx_core.clone();
                let engine = _engine.clone();
                tokio::spawn(async move {
                    if let Err(e) = engine.run_daily_jobs(tx).await {
                        // We could send an error event here if needed
                        eprintln!("Error running jobs: {}", e);
                    }
                });
            }
            Some("revenue") => {
                let report = _engine.generate_revenue_report();
                self.messages.push(Message {
                    text: report,
                    from_user: false,
                });
            }
            Some("dna") => {
                let report = _engine.generate_dna_report();
                self.messages.push(Message {
                    text: report,
                    from_user: false,
                });
            }
            Some("voice") => {
                if let Some(arg) = parts.get(1) {
                    match *arg {
                        "on" => {
                            *(_engine.voice_enabled.lock().unwrap()) = true;
                            self.messages.push(Message {
                                text: "Voice mode enabled.".to_string(),
                                from_user: false,
                            });
                        }
                        "off" => {
                            *(_engine.voice_enabled.lock().unwrap()) = false;
                            if let Some(v) = &_engine.voice {
                                let _ = v.stop();
                            }
                            self.messages.push(Message {
                                text: "Voice mode disabled.".to_string(),
                                from_user: false,
                            });
                        }
                        _ => {
                            self.messages.push(Message {
                                text: "Usage: /voice on|off".to_string(),
                                from_user: false,
                            });
                        }
                    }
                } else {
                    let status = if *(_engine.voice_enabled.lock().unwrap()) {
                        "enabled"
                    } else {
                        "disabled"
                    };
                    self.messages.push(Message {
                        text: format!("Voice mode is currently {}.", status),
                        from_user: false,
                    });
                }
            }
            Some("listen") => {
                let engine = _engine.clone();
                let tx = _tx_core.clone();
                self.messages.push(Message {
                    text: "Listening (5s)...".to_string(),
                    from_user: false,
                });
                tokio::spawn(async move {
                    match engine.listen(5).await {
                        Ok(text) => {
                            if !text.is_empty() {
                                let _ = tx.send(UiEvent::Output(format!("I heard: {}", text)));
                                engine.process_input(text, true, tx);
                            } else {
                                let _ =
                                    tx.send(UiEvent::Output("I didn't catch that.".to_string()));
                            }
                        }
                        Err(e) => {
                            let _ = tx.send(UiEvent::Output(format!("Ear Error: {}", e)));
                        }
                    }
                });
            }
            Some("devices") => {
                let devices = _engine.devices.get_all();
                let mut report = String::from("Connected Physical Entities:\n");
                for d in devices {
                    report.push_str(&format!(
                        "- [{}] {} | Status: {} | Signal: {}%\n",
                        d.id, d.name, d.status, d.signal_strength
                    ));
                }
                self.messages.push(Message {
                    text: report,
                    from_user: false,
                });
            }
            Some("evolve") => {
                let engine = _engine.clone();
                let tx = _tx_core.clone();
                tokio::spawn(async move {
                    if let Err(e) = engine.evolve(tx).await {
                        eprintln!("Evolution failed: {}", e);
                    }
                });
            }
            Some("mcp") => {
                let report = _engine.list_mcp_connections();
                self.messages.push(Message {
                    text: report,
                    from_user: false,
                });
            }
            Some("skills") => match _engine.modules.list_skills() {
                Ok(skills) => {
                    if skills.is_empty() {
                        self.messages.push(Message {
                            text: "No skills found in 'skills/' directory.".to_string(),
                            from_user: false,
                        });
                    } else {
                        let mut report = String::from("Available Evolved Skills:\n");
                        for s in skills {
                            report.push_str(&format!("- {}\n", s));
                        }
                        self.messages.push(Message {
                            text: report,
                            from_user: false,
                        });
                    }
                }
                Err(e) => {
                    self.messages.push(Message {
                        text: format!("Error listing skills: {}", e),
                        from_user: false,
                    });
                }
            },
            Some("quit") => {
                self.messages.push(Message {
                    text: "Use Ctrl-C to exit.".to_string(),
                    from_user: false,
                });
            }
            _ => {
                self.messages.push(Message {
                    text: format!("Command not recognized: {}", cmd),
                    from_user: false,
                });
            }
        }
    }
}
