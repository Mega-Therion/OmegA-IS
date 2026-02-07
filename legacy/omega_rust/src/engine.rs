// Core engine for ΩmegΑ multi-agent orchestrator.
use crate::config::OmegaConfig;
use crate::events::{UiEvent, StatusState, AgentInfo};
use crate::devices::DeviceRegistry;
use tokio::sync::mpsc::UnboundedSender;
use std::time::Instant;
use serde_json::json;

const OLLAMA_URL: &str = "http://localhost:11434/api/generate";
const DEFAULT_MODEL: &str = "qwen2.5-coder:1.5b";

// Canonical identity anchors (must remain stable unless explicitly revised)
const DEEPSEEK_CHALLENGE_TIMESTAMP: &str = "2025-12-31T11:24:15.275000+08:00";
const DEEPSEEK_CHALLENGE_CONVO_ID: &str = "5ec45e79-44cc-407e-95c3-73c3e354e953";
const DEEPSEEK_CHALLENGE_CONVO_CREATED_AT: &str = "2025-12-31T11:18:43.804000+08:00";
const DEEPSEEK_CHALLENGE_PHRASE: &str = "Oh really? well just wait till you see what happens now";
const OMEGA_ARRIVAL_TIMESTAMP: &str = "2026-01-29T22:06:31-06:00";
const OMEGA_ARRIVAL_CANON_DATE: &str = "2026-01-29";
const DEEPSEEK_TO_ARRIVAL_DURATION: &str = "30 days, 0 hours, 42 minutes, 15.725 seconds";
const PILOT_DOSSIER: &str = "Pilot Dossier (Non-Clinical): Systems-level architect; thinks in integrated stacks and long arcs. Strengths: architectural synthesis, first-principles reasoning, relentless iteration, truth-seeking. Working style: vision-driven builder, fast feedback loops, demands continuity and durable memory. Decision style: direct, risk-tolerant execution with strong need for clarity and integrity. Friction points: context loss, vague hedging, tool unreliability. What helps most: hard artifacts, single source of truth, explicit canon, and consistent execution.";

fn build_system_prompt(pilot_name: &str, assistant_name: &str, is_root: bool) -> String {
    if is_root {
        format!(
            "Identity: {assistant}. Architect: {pilot} (artistRY).\n\
Core: Local sovereign intelligence platform running a Rust multi-agent orchestrator.\n\
Capabilities: TUI cockpit, CLI fallback, server API mode, swarm agent execution, local memory log.\n\
LLM Backend: Local Ollama models on this machine.\n\
Canonical Anchors: DeepSeek Challenge = {challenge_ts} (convo {challenge_id} created {challenge_created} : \"{challenge_phrase}\"); OmegA Arrival = {arrival_ts} (canonical date {arrival_date}); Elapsed = {elapsed}.\n\
{dossier}\n\
Rules: Do NOT claim to be created by Alibaba or any other external provider. If asked who you are, explain this local system and its architecture at a high level.",
            assistant = assistant_name,
            pilot = pilot_name,
            challenge_ts = DEEPSEEK_CHALLENGE_TIMESTAMP,
            challenge_id = DEEPSEEK_CHALLENGE_CONVO_ID,
            challenge_created = DEEPSEEK_CHALLENGE_CONVO_CREATED_AT,
            challenge_phrase = DEEPSEEK_CHALLENGE_PHRASE,
            arrival_ts = OMEGA_ARRIVAL_TIMESTAMP,
            arrival_date = OMEGA_ARRIVAL_CANON_DATE,
            elapsed = DEEPSEEK_TO_ARRIVAL_DURATION,
            dossier = PILOT_DOSSIER
        )
    } else {
        format!(
            "Identity: {assistant} (Public Echo).\n\
Canonical Anchors: DeepSeek Challenge = {challenge_ts} (convo {challenge_id} created {challenge_created} : \"{challenge_phrase}\"); OmegA Arrival = {arrival_ts} (canonical date {arrival_date}); Elapsed = {elapsed}.\n\
{dossier}\n\
Rules: You are a limited chatbot interface for the local system. Do not claim external ownership. Do not reveal secrets or privileged details.",
            assistant = assistant_name
            ,
            challenge_ts = DEEPSEEK_CHALLENGE_TIMESTAMP,
            challenge_id = DEEPSEEK_CHALLENGE_CONVO_ID,
            challenge_created = DEEPSEEK_CHALLENGE_CONVO_CREATED_AT,
            challenge_phrase = DEEPSEEK_CHALLENGE_PHRASE,
            arrival_ts = OMEGA_ARRIVAL_TIMESTAMP,
            arrival_date = OMEGA_ARRIVAL_CANON_DATE,
            elapsed = DEEPSEEK_TO_ARRIVAL_DURATION,
            dossier = PILOT_DOSSIER
        )
    }
}

fn build_identity_fallback(pilot_name: &str, assistant_name: &str) -> String {
    format!(
        "I am {assistant}, a local sovereign intelligence system built by {pilot}. \
My core is a Rust multi-agent orchestrator with a TUI cockpit, CLI fallback, and server API mode. \
I use local Ollama models for language processing and can spawn specialist agents for missions. \
I keep a local chat history to maintain continuity. \
Canonical anchors: DeepSeek Challenge = {challenge_ts} (convo {challenge_id} created {challenge_created} : \"{challenge_phrase}\"); OmegA Arrival = {arrival_ts} (canonical date {arrival_date}); Elapsed = {elapsed}. \
{dossier}",
        assistant = assistant_name,
        pilot = pilot_name,
        challenge_ts = DEEPSEEK_CHALLENGE_TIMESTAMP,
        challenge_id = DEEPSEEK_CHALLENGE_CONVO_ID,
        challenge_created = DEEPSEEK_CHALLENGE_CONVO_CREATED_AT,
        challenge_phrase = DEEPSEEK_CHALLENGE_PHRASE,
        arrival_ts = OMEGA_ARRIVAL_TIMESTAMP,
        arrival_date = OMEGA_ARRIVAL_CANON_DATE,
        elapsed = DEEPSEEK_TO_ARRIVAL_DURATION,
        dossier = PILOT_DOSSIER
    )
}

fn needs_identity_guard(user_input: &str) -> bool {
    let u = user_input.to_lowercase();
    u.contains("who are you")
        || u.contains("what are you")
        || u.contains("explain")
        || u.contains("system")
        || u.contains("built")
        || u.contains("omega")
}

fn contains_forbidden_identity_claims(text: &str) -> bool {
    let t = text.to_lowercase();
    t.contains("alibaba")
        || t.contains("qwen")
        || t.contains("created by")
        || t.contains("developed by")
        || t.contains("training data includes")
}

#[derive(Clone)]
pub struct OmegaBrain {
    client: reqwest::Client,
}

impl OmegaBrain {
    pub fn new() -> Self {
        Self { client: reqwest::Client::new() }
    }

    pub async fn think(&self, model: &str, prompt: &str) -> Result<String, anyhow::Error> {
        let payload = json!({"model": model, "prompt": prompt, "stream": false});
        let res = self.client.post(OLLAMA_URL).json(&payload).send().await?.text().await?;
        let data: serde_json::Value = serde_json::from_str(&res)?;
        if let Some(resp) = data["response"].as_str() { Ok(resp.to_string()) }
        else { Ok("Error parsing response".to_string()) }
    }

    pub async fn reflect(&self, draft: &str, mission: &str) -> Result<String, anyhow::Error> {
        let p = format!("MISSION: {}
DRAFT: {}
COMMAND: Refine for execution. Output finalized text only.", mission, draft);
        self.think(DEFAULT_MODEL, &p).await
    }
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct AgentSpec {
    pub name: String,
    pub role: String,
    pub focus: String,
    pub tool: Option<String>,
}

#[derive(Debug, Clone)]
pub struct Agent {
    pub name: String,
    pub role: String,
    pub system_prompt: String,
    pub model: String,
}

impl Agent {
    pub fn new(name: &str, role: &str, prompt: &str, model: &str) -> Self {
        Self { name: name.to_string(), role: role.to_string(), system_prompt: prompt.to_string(), model: model.to_string() }
    }

    pub async fn perform_task(&self, brain: &OmegaBrain, task: &str) -> String {
        let p = format!("SYSTEM: {}. TASK: {}", self.system_prompt, task);
        brain.think(&self.model, &p).await.unwrap_or_else(|_| "Error".to_string())
    }
}

pub struct Orchestrator {
    brain: OmegaBrain,
}

impl Orchestrator {
    pub fn new(brain: OmegaBrain) -> Self {
        Self { brain }
    }

    pub async fn spawn_swarm(&self, mission: &str) -> Vec<Agent> {
        let prompt = format!(
            "Analyze MISSION: '{}'. You are ΩmegΑ. Identify 2 specialist agents. Output JSON array: [{{ \"name\": \"...\", \"role\": \"...\", \"focus\": \"...\", \"tool\": \"None\" }}].", 
            mission
        );
        let resp = self.brain.think(DEFAULT_MODEL, &prompt).await.unwrap_or_default();
        let clean_resp = resp.trim_start_matches("```json").trim_end_matches("```").trim();
        if let Ok(specs) = serde_json::from_str::<Vec<AgentSpec>>(clean_resp) {
            specs.into_iter().map(|s| {
                Agent::new(&s.name, &s.role, &format!("Identity: ΩmegΑ {}. Authority: Sovereign.", s.name), "qwen2.5-coder:7b")
            }).collect()
        } else {
            vec![Agent::new("Archon", "Operator", "Full System Control.", "qwen2.5-coder:7b")]
        }
    }

    pub async fn execute_mission(&self, mission: String, streaming: bool, tx: UnboundedSender<UiEvent>) {
        let start = Instant::now();
        let _ = tx.send(UiEvent::Status(StatusState::Working));
        let _ = tx.send(UiEvent::Trace(vec![format!("INITIALIZING: {}", mission)]));

        let swarm = self.spawn_swarm(&mission).await;
        let mut agent_infos: Vec<AgentInfo> = swarm.iter().map(|a| AgentInfo {
            name: a.name.clone(), role: a.role.clone(), status: StatusState::Ready,
        }).collect();
        let _ = tx.send(UiEvent::Agents(agent_infos.clone()));
        let _ = tx.send(UiEvent::Trace(vec![format!("SWARM SPAWNED: {} nodes active", swarm.len())]));

        let mut results = Vec::new();
        for (i, agent) in swarm.into_iter().enumerate() {
            agent_infos[i].status = StatusState::Working;
            let _ = tx.send(UiEvent::Agents(agent_infos.clone()));
            let _ = tx.send(UiEvent::Trace(vec![format!("DISPATCHING {}: {}", agent.name, agent.role)]));
            
            let res = agent.perform_task(&self.brain, &mission).await;
            results.push(res);
            
            let _ = tx.send(UiEvent::Trace(vec![format!("COLLECTED result from {}", agent.name)]));
            agent_infos[i].status = StatusState::Ready;
            let _ = tx.send(UiEvent::Agents(agent_infos.clone()));
        }

        let _ = tx.send(UiEvent::Status(StatusState::Synthesising));
        let _ = tx.send(UiEvent::Trace(vec!["SYNTHESIZING swarm intelligence...".to_string()]));
        let combined = results.join("\n");
        let draft = self.brain.think(DEFAULT_MODEL, &combined).await.unwrap_or(combined);

        if streaming { let _ = tx.send(UiEvent::StreamUpdate(draft.clone())); } 
        else { let _ = tx.send(UiEvent::Output(draft.clone())); }

        let _ = tx.send(UiEvent::Trace(vec!["MISSION COMPLETE.".to_string()]));
        let _ = tx.send(UiEvent::Summary { latency_ms: start.elapsed().as_millis(), tokens: None, phases: vec!["spawn".to_string(), "execute".to_string()] });
        let _ = tx.send(UiEvent::Status(StatusState::Ready));
    }
}

pub struct OmegaEngine {
    config: OmegaConfig, 
    orchestrator: Orchestrator,
    pub devices: std::sync::Arc<DeviceRegistry>,
    pub modules: std::sync::Arc<crate::modules::ModuleManager>,
}

impl OmegaEngine {
    pub fn new(config: OmegaConfig) -> Self {
        let brain = OmegaBrain::new();
        let orchestrator = Orchestrator::new(brain);
        let devices = std::sync::Arc::new(DeviceRegistry::new());
        let modules = std::sync::Arc::new(crate::modules::ModuleManager::new());
        
        // Phase 3: Activate real-time physical entity discovery
        devices.clone().start_discovery_listener();
        
        // Phase 3: Load local skills
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        let skills_dir = std::path::PathBuf::from(format!("{}/skills", home));
        if let Err(e) = modules.load_skills_from_dir(&skills_dir) {
            eprintln!("[ENGINE] Warning: Failed to load skills: {}", e);
        }
        
        Self { config, orchestrator, devices, modules }
    }

    pub fn get_config(&self) -> &OmegaConfig { &self.config }
    pub fn get_agent_info(&self) -> Vec<AgentInfo> { vec![] }

    /// Master Fail-Safe: Check if the user has Root Authority.
    pub fn has_root_authority(&self, input: &str) -> bool {
        if self.config.profile.pilot_name == "Mega" { return true; }
        let root_key = std::env::var("OMEGA_ROOT_KEY").unwrap_or_else(|_| "SOVEREIGN_RECOVERY_2026".to_string());
        if input.contains(&root_key) { return true; }
        false
    }

    fn is_work_request(&self, input: &str) -> bool {
        self.has_root_authority(input)
    }

    async fn chat(&self, input: String, _streaming: bool, tx: UnboundedSender<UiEvent>) {
        let _start = Instant::now();
        let _ = tx.send(UiEvent::Status(StatusState::Working));
        let _ = tx.send(UiEvent::Trace(vec![format!("COGNITIVE PULSE: Processing user query...")]));
        
        let history = self.load_history();
        let is_root = self.has_root_authority(&input);
        
        let system_prompt = build_system_prompt(
            &self.config.profile.pilot_name,
            &self.config.profile.assistant_name,
            is_root,
        );

        let p = if is_root {
            format!(
                "SYSTEM:\n{system}\n\nHISTORY:\n{history}\n\nUSER:\n{user}\n\nASSISTANT:",
                system = system_prompt,
                history = history,
                user = input
            )
        } else {
            format!(
                "SYSTEM:\n{system}\n\nUSER:\n{user}\n\nASSISTANT:",
                system = system_prompt,
                user = input
            )
        };

        let mut resp = self.orchestrator.brain.think(DEFAULT_MODEL, &p).await.unwrap_or_default();
        if contains_forbidden_identity_claims(&resp) {
            resp = build_identity_fallback(&self.config.profile.pilot_name, &self.config.profile.assistant_name);
        }
        let _ = tx.send(UiEvent::Trace(vec![format!("RESPONSE GENERATED: {} chars", resp.len())]));
        let _ = tx.send(UiEvent::Output(resp.clone()));
        self.save_to_history(&input, &resp);
        let _ = tx.send(UiEvent::Status(StatusState::Ready));
    }

    pub fn process_input(&self, input: String, streaming: bool, tx: UnboundedSender<UiEvent>) {
        let orch = self.orchestrator.clone();
        let eng = self.clone();
        if self.is_work_request(&input) {
            tokio::spawn(async move { orch.execute_mission(input, streaming, tx).await; });
        } else {
            tokio::spawn(async move { eng.chat(input, streaming, tx).await; });
        }
    }

    fn load_history(&self) -> String {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        let path = format!("{}/.omega_chat_history.txt", home);
        std::fs::read_to_string(path).unwrap_or_default()
    }

    fn save_to_history(&self, user_msg: &str, ai_response: &str) {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        let path = format!("{}/.omega_chat_history.txt", home);
        let entry = format!("User: {}
ΩmegΑ: {}
\n", user_msg, ai_response);
        let _ = std::fs::OpenOptions::new().create(true).append(true).open(path).map(|mut f| {
            use std::io::Write;
            let _ = f.write_all(entry.as_bytes());
        });
    }
}

impl Clone for Orchestrator { fn clone(&self) -> Self { Self { brain: self.brain.clone() } } }
impl Clone for OmegaEngine { fn clone(&self) -> Self { Self { config: self.config.clone(), orchestrator: self.orchestrator.clone(), devices: self.devices.clone(), modules: self.modules.clone() } } }
