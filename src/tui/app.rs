//! Application state and event handling for the TUI.
use crate::events::{UiEvent, StatusState, AgentInfo, SystemMetrics};
use crate::engine::OmegaEngine;
use crate::config::UserProfile;
use crate::devices::PhysicalEntity;
use crossterm::event::{KeyEvent, KeyCode, KeyModifiers};
use tokio::sync::mpsc::UnboundedSender;
use std::fmt;

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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tab {
    Cockpit,
    Nexus, 
}

#[derive(Debug, Clone, PartialEq)]
pub struct Message {
    pub text: String,
    pub from_user: bool,
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
    pub active_tab: Tab,
    pub spinner_index: usize,
    
    // --- Scroll State ---
    pub scroll: u16,
    pub target_scroll: u16,
    pub auto_scroll: bool,
    pub scroll_speed: u16,
    
    // --- Illumination Pulse State ---
    pub pulse_pos: f64,
    
    // --- Animation State for Nexus ---
    pub animation_tick: u64,
    
    pub profile: UserProfile,
    pub metrics: SystemMetrics,
    pub entities: Vec<PhysicalEntity>,
}

impl App {
    pub fn new(profile: UserProfile) -> Self {
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
            active_tab: Tab::Cockpit,
            spinner_index: 0,
            
            scroll: 0,
            target_scroll: 0,
            auto_scroll: true,
            scroll_speed: 2,
            
            pulse_pos: 0.0,
            animation_tick: 0,
            
            profile,
            metrics: SystemMetrics {
                load: vec![0; 50],
                memory_used: 0.1,
                agent_load: vec![],
            },
            entities: Vec::new(),
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
        let new_load = if self.status == StatusState::Working { rng.gen_range(5..10) } else { rng.gen_range(0..3) };
        self.metrics.load.remove(0);
        self.metrics.load.push(new_load);
        let jitter = rng.gen_range(-0.01..0.01);
        self.metrics.memory_used = (self.metrics.memory_used + jitter).clamp(0.05, 0.95);

        // Update Pulse position (Slow letter illumination)
        self.pulse_pos += 0.5;
        if self.pulse_pos > 100.0 {
            self.pulse_pos = 0.0;
        }
        
        // Update Nexus animation
        self.animation_tick = self.animation_tick.wrapping_add(1);

        // Handle smooth scrolling catchup
        if self.scroll != self.target_scroll {
            if self.scroll < self.target_scroll {
                let diff = self.target_scroll - self.scroll;
                self.scroll += diff.min(self.scroll_speed);
            } else {
                let diff = self.scroll - self.target_scroll;
                self.scroll -= diff.min(self.scroll_speed);
            }
        }
    }

    pub fn on_ui_event(&mut self, event: UiEvent) {
        match event {
            UiEvent::Output(text) => {
                self.messages.push(Message { text, from_user: false });
                self.summary = None;
                if self.auto_scroll { self.target_scroll = 9999; }
            }
            UiEvent::StreamUpdate(token) => {
                if let Some(last) = self.messages.last_mut() {
                    if !last.from_user { last.text.push_str(&token); }
                    else { self.messages.push(Message { text: token, from_user: false }); }
                } else { self.messages.push(Message { text: token, from_user: false }); }
                if self.auto_scroll { self.target_scroll = 9999; }
            }
            UiEvent::Summary { latency_ms, tokens, phases } => { self.summary = Some((latency_ms, tokens, phases)); }
            UiEvent::Status(state) => { self.status = state; }
            UiEvent::Agents(list) => { self.agents = list; }
            UiEvent::Metrics(m) => { self.metrics = m; }
            UiEvent::Devices(list) => { self.entities = list; }
            UiEvent::Trace(lines) => {
                let mut new_trace = lines;
                new_trace.extend(self.trace.clone());
                self.trace = new_trace.into_iter().take(20).collect();
            }
        }
    }

    pub fn on_key(&mut self, key: KeyEvent, tx_core: &UnboundedSender<UiEvent>, engine: &OmegaEngine) -> bool {
        match key.code {
            KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => { return true; }
            KeyCode::Tab => {
                self.active_tab = match self.active_tab {
                    Tab::Cockpit => Tab::Nexus,
                    Tab::Nexus => Tab::Cockpit,
                };
            }
            KeyCode::Char('1') => { self.active_tab = Tab::Cockpit; }
            KeyCode::Char('2') => { self.active_tab = Tab::Nexus; }
            KeyCode::Enter => {
                let trimmed = self.input.trim().to_string();
                if trimmed.starts_with('/') {
                    self.handle_command(trimmed, tx_core, engine);
                } else if !trimmed.is_empty() {
                    self.messages.push(Message { text: trimmed.clone(), from_user: true });
                    self.status = StatusState::Working;
                    self.auto_scroll = true;
                    self.target_scroll = 9999;
                    engine.process_input(trimmed, self.is_streaming, tx_core.clone());
                }
                self.input.clear();
                self.pulse_pos = 0.0;
            }
            KeyCode::Backspace => { self.input.pop(); }
            KeyCode::Char(c) => { self.input.push(c); }
            KeyCode::Up => {
                self.auto_scroll = false;
                if self.target_scroll > 0 { self.target_scroll -= 1; }
            }
            KeyCode::Down => {
                if self.target_scroll < 9999 { self.target_scroll += 1; }
            }
            KeyCode::PageUp => {
                self.auto_scroll = false;
                self.target_scroll = self.target_scroll.saturating_sub(10);
            }
            KeyCode::PageDown => {
                self.target_scroll = self.target_scroll.saturating_add(10);
            }
            _ => {}
        }
        false
    }

    fn handle_command(&mut self, cmd: String, _tx_core: &UnboundedSender<UiEvent>, _engine: &OmegaEngine) {
        let parts: Vec<&str> = cmd.split_whitespace().collect();
        match parts.get(0).map(|s| s.trim_start_matches('/')) {
            Some("help") => {
                self.messages.push(Message {
                    text: "Available: /help, /status, /agents, /stream on|off, /mode focus|ops|showcase, /scroll <speed>, /quit".to_string(),
                    from_user: false,
                });
            }
            Some("scroll") => {
                if let Some(arg) = parts.get(1) {
                    if let Ok(speed) = arg.parse::<u16>() {
                        self.scroll_speed = speed;
                        self.messages.push(Message { text: format!("Scroll speed set to {}", speed), from_user: false });
                    }
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
            _ => { self.messages.push(Message { text: format!("Command not recognized: {}", cmd), from_user: false }); }
        }
    }
}
