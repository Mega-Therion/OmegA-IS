//! UI event definitions for ΩmegA.
//!
//! The core engine emits these events to the UI layer via a
//! [`tokio::sync::mpsc::UnboundedSender`]. The UI consumes events and
//! updates its state accordingly.

use std::fmt;

/// Real-time metrics for the JARVIS-style diagnostics
#[derive(Debug, Clone)]
pub struct SystemMetrics {
    pub load: Vec<u64>,     // Scrolling load history
    pub memory_used: f64,   // 0.0 to 1.0
    pub agent_load: Vec<(String, u64)>, // Name and score
}

/// An event sent from the core engine to the UI.
#[derive(Debug, Clone)]
pub enum UiEvent {
    /// A complete message to display in the output panel (non-streaming).
    Output(String),
    /// A partial streaming update.
    StreamUpdate(String),
    /// Summarises the completed interaction.
    Summary {
        latency_ms: u128,
        tokens: Option<usize>,
        phases: Vec<String>,
    },
    /// Update the global status indicator.
    Status(StatusState),
    /// Provide the current list of agents.
    Agents(Vec<AgentInfo>),
    /// Real-time telemetry for diagnostics panels
    Metrics(SystemMetrics),
    /// List of physical entities/devices discovered
    Devices(Vec<crate::devices::PhysicalEntity>),
    /// Trace output.
    Trace(Vec<String>),
    /// Prompt the user to confirm a dispatch.
    DispatchPrompt { agent_count: usize, summary: String },
    /// Update task card status in the UI.
    TaskUpdate(TaskUpdate),
}

/// Coarse status of the orchestrator.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StatusState {
    Ready,
    Working,
    Synthesising,
}

/// Task lifecycle state for UI cards.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskStatus {
    Pending,
    Running,
    Done,
    Failed,
}

/// UI-facing task update.
#[derive(Debug, Clone)]
pub struct TaskUpdate {
    pub id: String,
    pub name: String,
    pub status: TaskStatus,
    pub detail: String,
}

impl fmt::Display for StatusState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let c = match self {
            StatusState::Ready => 'α',
            StatusState::Working => 'ω',
            StatusState::Synthesising => 'Σ',
        };
        write!(f, "{}", c)
    }
}

/// Information about a single agent.
#[derive(Debug, Clone)]
pub struct AgentInfo {
    pub name: String,
    pub role: String,
    pub status: StatusState,
}
