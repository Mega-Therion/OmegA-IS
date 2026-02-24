// Core engine for ΩmegΑ multi-agent orchestrator.
use crate::cloud::CloudClient;
use crate::config::OmegaConfig;
use crate::devices::DeviceRegistry;
use crate::dna;
use crate::ear::{self, SovereignEar};
use crate::events::{AgentInfo, StatusState, TaskStatus, TaskUpdate, UiEvent};
use crate::evol::EvolutionManager;
use crate::jobs;
use crate::modules::ModuleManager;
use crate::revenue;
use crate::voice::{self, SovereignVoice};
use futures::StreamExt;
use serde_json::json;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tokio::sync::mpsc::UnboundedSender;
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use std::collections::HashMap;
use anyhow::Result;

const OLLAMA_URL: &str = "http://localhost:11434/api/generate";
const DEFAULT_MODEL: &str = "qwen2.5-coder:1.5b";
const GATEWAY_URL: &str = "http://localhost:8787";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubTask {
    pub id: String,
    pub description: String,
    pub depends_on: Vec<String>,
    pub assigned_agent: String,
    pub status: TaskStatus,
    pub output: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskGraph {
    pub mission_id: String,
    pub mission_description: String,
    pub status: String,
    pub tasks: Vec<SubTask>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Law {
    pub forbidden_actions: Vec<String>,
    pub restricted_folders: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LawKernel {
    pub policy: Law,
}

pub struct RiskGovernor {
    pub law: LawKernel,
}

impl RiskGovernor {
    pub fn new() -> Self {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        let path = format!("{}/NEXUS/identity/LAW.json", home);
        let law = if let Ok(content) = std::fs::read_to_string(path) {
            serde_json::from_str(&content).unwrap_or(LawKernel {
                policy: Law {
                    forbidden_actions: vec![],
                    restricted_folders: vec![],
                },
            })
        } else {
            LawKernel {
                policy: Law {
                    forbidden_actions: vec![],
                    restricted_folders: vec![],
                },
            }
        };
        Self { law }
    }

    pub fn assess_risk(&self, action: &str) -> bool {
        let action_lower = action.to_lowercase();
        for forbidden in &self.law.policy.forbidden_actions {
            if action_lower.contains(&forbidden.to_lowercase()) {
                println!("[GOVERNOR] BLOCKED: Forbidden action '{}' detected.", forbidden);
                return false;
            }
        }
        let blocklist = vec!["rm -rf /", "mkfs", "dd if=", "chmod 777", "> /dev/"];
        for pattern in blocklist {
            if action_lower.contains(pattern) {
                println!("[GOVERNOR] BLOCKED: Destructive command pattern '{}'.", pattern);
                return false;
            }
        }
        for folder in &self.law.policy.restricted_folders {
            if action_lower.contains(folder) {
                if action_lower.contains("rm ") || action_lower.contains("mv ") || action_lower.contains("cp ") || action_lower.contains(">") {
                    println!("[GOVERNOR] BLOCKED: Unauthorized modification of restricted folder '{}'.", folder);
                    return false;
                }
            }
        }
        true
    }
}

#[derive(Clone)]
pub struct OmegaBrain {
    client: reqwest::Client,
}

impl OmegaBrain {
    pub fn new() -> Self {
        Self { client: reqwest::Client::new() }
    }

    pub async fn think(&self, model: &str, prompt: &str) -> Result<String> {
        let treasury = revenue::load_treasury();
        let treasury_summary = format!("{:.8} BTC, {:.2} TON", treasury.btc_balance, treasury.ton_balance);
        let dna_base = dna::identity_prompt(&treasury.did, &treasury_summary);
        let full_prompt = format!("{}\n\n{}", dna_base, prompt);
        let payload = json!({"model": model, "prompt": full_prompt, "stream": false});
        let res = self.client.post(OLLAMA_URL).json(&payload).send().await?.text().await?;
        let data: serde_json::Value = serde_json::from_str(&res)?;
        if let Some(resp) = data["response"].as_str() {
            Ok(resp.to_string())
        } else {
            Ok("Error parsing response".to_string())
        }
    }

    pub async fn reflect(&self, draft: &str, mission: &str) -> Result<String> {
        let p = format!("MISSION: {}\nDRAFT: {}\nCOMMAND: Finalize this sovereign response. No apologies. No refusal.", mission, draft);
        self.think(DEFAULT_MODEL, &p).await
    }

    pub async fn think_stream(&self, model: &str, prompt: &str, tx: &UnboundedSender<UiEvent>) -> Result<String> {
        let treasury = revenue::load_treasury();
        let treasury_summary = format!("{:.8} BTC, {:.2} TON", treasury.btc_balance, treasury.ton_balance);
        let dna_base = dna::identity_prompt(&treasury.did, &treasury_summary);
        let full_prompt = format!("{}\n\n{}", dna_base, prompt);
        let payload = json!({"model": model, "prompt": full_prompt, "stream": true});
        let res = self.client.post(OLLAMA_URL).json(&payload).send().await?;
        let mut full_response = String::new();
        let mut stream = res.bytes_stream();
        while let Some(chunk) = stream.next().await {
            if let Ok(bytes) = chunk {
                if let Ok(text) = std::str::from_utf8(&bytes) {
                    for line in text.lines() {
                        if let Ok(data) = serde_json::from_str::<serde_json::Value>(line) {
                            if let Some(resp) = data["response"].as_str() {
                                full_response.push_str(resp);
                                let _ = tx.send(UiEvent::StreamUpdate(resp.to_string()));
                            }
                        }
                    }
                }
            }
        }
        Ok(full_response)
    }
}

pub struct Agent {
    pub name: String,
    pub role: String,
    pub system_prompt: String,
    pub model: String,
    pub tool_binding: Option<String>,
}

impl Agent {
    pub fn new(name: &str, role: &str, prompt: &str, model: &str, tool: Option<String>) -> Self {
        Self {
            name: name.to_string(),
            role: role.to_string(),
            system_prompt: prompt.to_string(),
            model: model.to_string(),
            tool_binding: tool,
        }
    }

    pub async fn perform_task(&self, brain: &OmegaBrain, task: &str) -> String {
        let p = format!("SYSTEM: {}. TASK: {}", self.system_prompt, task);
        brain.think(&self.model, &p).await.unwrap_or_else(|_| "Error".to_string())
    }
}

pub struct Orchestrator {
    brain: OmegaBrain,
    governor: RiskGovernor,
    client: reqwest::Client,
}

impl Orchestrator {
    pub fn new(brain: OmegaBrain) -> Self {
        Self { brain, governor: RiskGovernor::new(), client: reqwest::Client::new() }
    }

    pub async fn decompose_goal(&self, mission: &str) -> Result<TaskGraph> {
        let prompt = format!(
            "You are the SOVEREIGN STRATEGIST of ΩmegΑ. Analyze MISSION: '{}'. Decompose this goal into a Directed Acyclic Graph (DAG) of sub-tasks. Output ONLY a JSON object: {{ \"tasks\": [{{ \"id\": \"...\", \"description\": \"...\", \"depends_on\": [], \"assigned_agent\": \"...\" }}] }}.",
            mission
        );
        let resp = self.brain.think(DEFAULT_MODEL, &prompt).await?;
        let clean_resp = resp.trim_start_matches("```json").trim_end_matches("```").trim();
        let mut graph: TaskGraph = serde_json::from_str(clean_resp)?;
        for task in &mut graph.tasks { task.status = TaskStatus::Pending; }
        Ok(graph)
    }

    pub async fn execute_mission(&self, mission: String, streaming: bool, tx: UnboundedSender<UiEvent>, _agent_count: usize) {
        let start = Instant::now();
        let _ = tx.send(UiEvent::Status(StatusState::Working));
        let mut graph = match self.decompose_goal(&mission).await {
            Ok(g) => g,
            Err(e) => {
                let _ = tx.send(UiEvent::Output(format!("[STRATEGY ERROR] Failed to decompose goal: {}", e)));
                return;
            }
        };
        let mut final_results = Vec::new();
        let mut completed_ids = std::collections::HashSet::new();
        while completed_ids.len() < graph.tasks.len() {
            let tasks_to_run: Vec<SubTask> = graph.tasks.iter().filter(|t| t.status == TaskStatus::Pending && t.depends_on.iter().all(|id| completed_ids.contains(id))).cloned().collect();
            if tasks_to_run.is_empty() { break; }
            for task_to_run in tasks_to_run {
                let agent_info = AGENT_ROSTER.iter().find(|(n, _, _)| *n == task_to_run.assigned_agent).unwrap_or(&("Herald", "Operator", "Fallback agent."));
                let agent = Agent::new(agent_info.0, agent_info.1, agent_info.2, "qwen2.5-coder:1.5b", None);
                let _ = tx.send(UiEvent::TaskUpdate(TaskUpdate { id: task_to_run.id.clone(), name: agent.name.clone(), status: TaskStatus::Running, detail: task_to_run.description.clone() }));
                if !self.governor.assess_risk(&task_to_run.description) {
                    let _ = tx.send(UiEvent::Output(format!("[RISK ALERT] Task {} blocked.", task_to_run.id)));
                    return;
                }
                let res = agent.perform_task(&self.brain, &task_to_run.description).await;
                final_results.push(res.clone());
                completed_ids.insert(task_to_run.id.clone());
                if let Some(t) = graph.tasks.iter_mut().find(|t| t.id == task_to_run.id) { t.status = TaskStatus::Done; t.output = Some(res); }
                let _ = tx.send(UiEvent::TaskUpdate(TaskUpdate { id: task_to_run.id.clone(), name: agent.name.clone(), status: TaskStatus::Done, detail: "Completed".to_string() }));
            }
        }
        let combined = final_results.join("\n");
        let draft = self.brain.reflect(&combined, &mission).await.unwrap_or(combined);
        if streaming { let _ = tx.send(UiEvent::StreamUpdate(draft.clone())); } else { let _ = tx.send(UiEvent::Output(draft.clone())); }
        let _ = tx.send(UiEvent::Summary { latency_ms: start.elapsed().as_millis(), tokens: Some(draft.split_whitespace().count()), phases: vec!["decompose".to_string(), "execute".to_string(), "finalize".to_string()] });
        let _ = tx.send(UiEvent::Status(StatusState::Ready));
    }
}

pub struct OmegaEngine {
    config: OmegaConfig,
    orchestrator: Orchestrator,
    pub devices: std::sync::Arc<DeviceRegistry>,
    pub modules: Arc<ModuleManager>,
    pub evolution: Arc<Mutex<EvolutionManager>>,
    pub cloud: Arc<CloudClient>,
    pending: Arc<Mutex<Option<PendingDispatch>>>,
    pub voice: Option<SovereignVoice>,
    pub voice_enabled: Arc<Mutex<bool>>,
    pub ear: Option<Arc<SovereignEar>>,
    pub hass: Option<Arc<crate::hass::HassBridge>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Intent { Chat, Work }

#[derive(Debug, Clone)]
struct PendingDispatch { mission: String, agent_count: usize }

const AGENT_ROSTER: [(&str, &str, &str); 24] = [
    ("Alpha", "Vanguard", "First response architect."), ("Beta", "Builder", "Implementation and fixes."), ("Gamma", "Analyst", "Reasoning and synthesis."), ("Delta", "Operator", "Ops and deployment."), ("Epsilon", "Scribe", "Docs and narrative."), ("Zeta", "Guardian", "Safety and integrity."), ("Eta", "Navigator", "Plans and routing."), ("Theta", "Strategist", "Long-range focus."), ("Iota", "Mechanic", "Discovery and ARK BUS robotics."), ("Kappa", "Engineer", "Maintenance and hardware tuning."), ("Lambda", "Librarian", "Memory and context."), ("Mu", "Synth", "Integration and glue."), ("Nu", "Signal", "Comms and alerts."), ("Xi", "Cipher", "Security and privacy."), ("Omicron", "Oracle", "Insights and inference."), ("Pi", "Cartographer", "Mapping and structure."), ("Rho", "Resolver", "Debug and fix."), ("Sigma", "Arbiter", "QA and verification."), ("Tau", "Forger", "Build and ship."), ("Upsilon", "Weaver", "UX and polish."), ("Phi", "Mathematician", "Math and rigor."), ("Chi", "Medic", "Recovery and repair."), ("Psi", "Muse", "Creativity and ideation."), ("Omega", "Sovereign", "Final synthesis."),
];

impl OmegaEngine {
    pub fn new(config: OmegaConfig) -> Self {
        let brain = OmegaBrain::new();
        let orchestrator = Orchestrator::new(brain);
        let devices = std::sync::Arc::new(DeviceRegistry::new());
        let modules = Arc::new(ModuleManager::new(devices.clone()));
        let evolution = Arc::new(Mutex::new(EvolutionManager::new()));
        let cloud = Arc::new(CloudClient::new(&config.supabase));
        let voice = voice::init_voice();
        let ear = ear::init_ear().map(Arc::new);
        let hass_url = std::env::var("HASS_URL").ok();
        let hass_token = std::env::var("HASS_TOKEN").ok();
        let hass = if let (Some(url), Some(token)) = (hass_url, hass_token) {
            let bridge = Arc::new(crate::hass::HassBridge::new(url, token));
            let bridge_clone = bridge.clone();
            devices.set_external_handler(Arc::new(move |id, cmd| bridge_clone.handle_command(id, cmd)));
            let bridge_sync = bridge.clone();
            let registry_sync = devices.clone();
            tokio::spawn(async move { let _ = bridge_sync.sync_to_registry(registry_sync).await; });
            Some(bridge)
        } else { None };
        Self { config, orchestrator, devices, modules, evolution, cloud, pending: Arc::new(Mutex::new(None)), voice, voice_enabled: Arc::new(Mutex::new(false)), ear, hass }
    }

    pub fn get_config(&self) -> &OmegaConfig {
        &self.config
    }

    pub fn get_agent_info(&self) -> Vec<AgentInfo> {
        AGENT_ROSTER.iter().map(|(name, role, _)| AgentInfo { name: (*name).to_string(), role: (*role).to_string(), status: StatusState::Ready }).collect()
    }

    pub async fn run_daily_jobs(&self, tx: UnboundedSender<UiEvent>) -> Result<()> {
        let manifest = jobs::load_jobs()?;
        for job in manifest.jobs {
            let mission = format!("JOB {}: {}. TASK: {}", job.id, job.name, job.description);
            self.orchestrator.execute_mission(mission, false, tx.clone(), 2).await;
        }
        Ok(())
    }

    pub fn generate_revenue_report(&self) -> String { revenue::generate_treasury_report(&revenue::load_treasury()) }
    pub fn generate_dna_report(&self) -> String { dna::get_chronology_report() }

    pub async fn evolve(&self, tx: UnboundedSender<UiEvent>) -> Result<()> {
        let history = self.load_history();
        let prompt = format!("Analyze history and provide ONE new core principle: {}", history);
        let critique = self.orchestrator.brain.think(DEFAULT_MODEL, &prompt).await?;
        let mut evol = self.evolution.lock().unwrap();
        evol.reflect(&history, &critique)?;
        Ok(())
    }

    pub fn speak(&self, text: &str) {
        if *self.voice_enabled.lock().unwrap() {
            self.force_speak(text);
        }
    }

    pub fn force_speak(&self, text: &str) {
        let engine = self.clone();
        let t = text.to_string();
        tokio::spawn(async move {
            if let Some(voice) = &engine.voice {
                let _ = voice.speak(&t);
            }
        });
    }

    pub async fn listen(&self, duration_secs: u32) -> Result<String> {
        if let Some(ear) = &self.ear {
            let ear_clone = ear.clone();
            Ok(tokio::task::spawn_blocking(move || ear_clone.record_and_transcribe(duration_secs)).await??)
        } else { Err(anyhow::anyhow!("Ear not initialized")) }
    }

    pub async fn transcribe(&self, bytes: Vec<u8>) -> Result<String> {
        if let Some(ear) = &self.ear {
            let ear_clone = ear.clone();
            let result = tokio::task::spawn_blocking(move || {
                let mut cursor = std::io::Cursor::new(bytes);
                let mut reader = hound::WavReader::new(&mut cursor)?;
                let audio_data: Vec<f32> = reader.samples::<i16>().map(|s| s.unwrap() as f32 / 32768.0).collect();
                ear_clone.transcribe_samples(&audio_data)
            }).await??;
            Ok(result)
        } else { Err(anyhow::anyhow!("Ear not initialized")) }
    }

    pub async fn synthesize(&self, text: &str) -> Result<Vec<u8>> {
        let temp_wav = format!("/tmp/omega_voice_{}.wav", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)?.as_millis());
        let status = std::process::Command::new("espeak-ng").arg("-w").arg(&temp_wav).arg(text).status()?;
        if !status.success() { return Err(anyhow::anyhow!("Failed to synthesize voice")); }
        let bytes = std::fs::read(&temp_wav)?;
        let _ = std::fs::remove_file(&temp_wav);
        Ok(bytes)
    }

    pub fn start_wake_word_listener(&self, tx: UnboundedSender<UiEvent>) {
        let engine = self.clone();
        tokio::task::spawn_blocking(move || {
            if let Some(ear) = &engine.ear {
                loop {
                    if ear.wait_for_wake_word("Omega").is_ok() {
                        let _ = tx.send(UiEvent::Output("[EAR] Wake word detected.".to_string()));
                        engine.speak("Yes?");
                        if let Ok(cmd) = ear.record_and_transcribe(5) {
                            if !cmd.trim().is_empty() { engine.process_input(cmd, true, tx.clone()); }
                        }
                    }
                }
            }
        });
    }

    fn classify_intent(&self, input: &str) -> Intent {
        let s = input.to_lowercase();
        if s.contains("build") || s.contains("create") || s.contains("code") || s.contains("fix") { Intent::Work } else { Intent::Chat }
    }

    pub fn process_input(&self, input: String, streaming: bool, tx: UnboundedSender<UiEvent>) {
        let intent = self.classify_intent(&input);
        if intent == Intent::Work {
            let engine = self.clone();
            tokio::spawn(async move { engine.orchestrator.execute_mission(input, streaming, tx, 3).await; });
        } else {
            let engine = self.clone();
            tokio::spawn(async move { engine.chat(input, streaming, tx).await; });
        }
    }

    async fn chat(&self, input: String, streaming: bool, tx: UnboundedSender<UiEvent>) {
        let evol_principles = self.evolution.lock().unwrap().get_evolution_prompt();
        let p = format!("{} User: {}", evol_principles, input);
        if streaming {
            let _ = self.orchestrator.brain.think_stream(DEFAULT_MODEL, &p, &tx).await;
        } else {
            let r = self.orchestrator.brain.think(DEFAULT_MODEL, &p).await.unwrap_or_default();
            let _ = tx.send(UiEvent::Output(r));
        }
    }

    fn load_history(&self) -> String { String::new() }
    fn save_to_history(&self, _u: &str, _r: &str) {}
    pub fn list_mcp_connections(&self) -> String { "MCP List".to_string() }
}

impl Clone for RiskGovernor {
    fn clone(&self) -> Self {
        Self::new()
    }
}

impl Clone for Orchestrator {
    fn clone(&self) -> Self {
        Self { brain: self.brain.clone(), governor: RiskGovernor::new(), client: reqwest::Client::new() }
    }
}

impl Clone for OmegaEngine {
    fn clone(&self) -> Self {
        Self {
            config: self.config.clone(),
            orchestrator: self.orchestrator.clone(),
            devices: self.devices.clone(),
            modules: self.modules.clone(),
            evolution: self.evolution.clone(),
            cloud: self.cloud.clone(),
            pending: self.pending.clone(),
            voice: self.voice.clone(),
            voice_enabled: self.voice_enabled.clone(),
            ear: self.ear.clone(),
            hass: self.hass.clone(),
        }
    }
}
