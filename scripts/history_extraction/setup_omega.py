import os
import subprocess

# Define the project name
PROJECT_NAME = "omega_rust"

# Define the content for Cargo.toml
CARGO_TOML_CONTENT = """[package]
name = "omega_rust"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.11", features = ["json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
anyhow = "1.0"
async-trait = "0.1"
"""

# Define the content for src/main.rs (The Full Omega System)
MAIN_RS_CONTENT = r"""
use serde_json::json;
use std::env;

const OLLAMA_URL: &str = "http://localhost:11434/api/generate";
// Using the smaller model you downloaded
const MODEL_NAME: &str = "qwen2.5-coder:7b";

// --- PHASE 1: THE BRAIN (OLLAMA CLIENT) ---
#[derive(Clone)]
pub struct OmegaBrain {
    client: reqwest::Client,
}

impl OmegaBrain {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    /// The core function to "think" using your local model
    pub async fn think(&self, prompt: &str) -> Result<String, anyhow::Error> {
        let payload = json!({
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": false
        });

        // Simple retry logic or error handling could go here
        let res = self.client.post(OLLAMA_URL)
            .json(&payload)
            .send()
            .await?
            .text()
            .await?;

        // Parse Ollama's JSON response
        let data: serde_json::Value = serde_json::from_str(&res)?;

        // Extract just the response text
        if let Some(response_text) = data["response"].as_str() {
            Ok(response_text.to_string())
        } else {
            Ok(format!("Error parsing response: {:?}", data))
        }
    }
}

// --- PHASE 2: THE AGENTS ---
#[derive(Debug, Clone)]
pub struct Agent {
    pub name: String,
    pub role: String,
    pub system_prompt: String,
}

impl Agent {
    pub fn new(name: &str, role: &str, prompt: &str) -> Self {
        Self {
            name: name.to_string(),
            role: role.to_string(),
            system_prompt: prompt.to_string(),
        }
    }

    pub async fn perform_task(&self, brain: &OmegaBrain, task: &str) -> String {
        println!("[Agent: {}] logic initiated...", self.name);

        let full_prompt = format!(
            "SYSTEM: You are {}. Role: {}. {}\nUSER: {}",
            self.name, self.role, self.system_prompt, task
        );

        match brain.think(&full_prompt).await {
            Ok(response) => {
                println!("[Agent: {}] Task complete.", self.name);
                response
            }
            Err(e) => format!("Error: {}", e),
        }
    }
}

// --- PHASE 3: THE BRIDGE (ORCHESTRATOR) ---
pub struct Orchestrator {
    brain: OmegaBrain,
    agents: Vec<Agent>,
}

impl Orchestrator {
    pub fn new(brain: OmegaBrain) -> Self {
        Self {
            brain,
            agents: Vec::new(),
        }
    }

    pub fn register_agent(&mut self, agent: Agent) {
        self.agents.push(agent);
    }

    pub async fn execute_mission(&self, mission: &str) {
        println!("\n--- 🚀 OMEGA PROTOCOL INITIATED: {} ---", mission);

        // Step 1: Brainstorming Plan
        let plan_prompt = format!(
            "Analyze this mission: '{}'. Break it down into 2 distinct tasks for a Researcher and a Coder. Output simple bullet points.",
            mission
        );
        let plan = self.brain.think(&plan_prompt).await.unwrap_or_default();
        println!("\n[Orchestrator] Mission Plan:\n{}", plan);

        // Step 2: Execution Loop
        let mut results = Vec::new();

        for agent in &self.agents {
            // Simplified logic: Agent sees the plan and contributes their part
            let task_context = format!("Here is the plan: {}. Do your part based on your role.", plan);
            let output = agent.perform_task(&self.brain, &task_context).await;
            results.push(format!("FROM {}:\n{}", agent.name, output));
        }

        // Step 3: Synthesis
        let combined_data = results.join("\n\n");
        let final_prompt = format!(
            "Mission: {}\n\nAgent Reports:\n{}\n\nCOMMAND: Combine these reports into a final answer.",
            mission, combined_data
        );

        println!("\n[Orchestrator] Synthesizing final result...");
        let final_report = self.brain.think(&final_prompt).await.unwrap_or_else(|_| "Failed.".into());

        println!("\n--- ✅ MISSION COMPLETE ---\n{}", final_report);
    }
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();
    let default_mission = "Write a Python script that prints the Fibonacci sequence";
    let mission = if args.len() > 1 { &args[1] } else { default_mission };

    // Initialize System
    let brain = OmegaBrain::new();
    let mut omega = Orchestrator::new(brain);

    // Recruit Agents
    omega.register_agent(Agent::new(
        "Alpha",
        "Researcher",
        "You are an expert researcher. Explain the concepts behind the request clearly."
    ));

    omega.register_agent(Agent::new(
        "Beta",
        "Coder",
        "You are a Senior Engineer. Write ONLY code snippets. No markdown, no explanations."
    ));

    // Run
    omega.execute_mission(mission).await;
}
"""

def setup_project():
    # 1. Create the project directory
    if os.path.exists(PROJECT_NAME):
        print(f"Directory '{PROJECT_NAME}' already exists. Please delete it or rename it first.")
        return

    print(f"Creating project '{PROJECT_NAME}'...")
    try:
        # Run 'cargo new' to create the standard Rust directory structure
        subprocess.run(["cargo", "new", PROJECT_NAME], check=True)
    except FileNotFoundError:
        print("Error: 'cargo' command not found. Do you have Rust installed?")
        print("Install it with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh")
        return

    # 2. Path to the new files
    cargo_toml_path = os.path.join(PROJECT_NAME, "Cargo.toml")
    main_rs_path = os.path.join(PROJECT_NAME, "src", "main.rs")

    # 3. Write Cargo.toml
    print("Writing Cargo.toml...")
    with open(cargo_toml_path, "w") as f:
        f.write(CARGO_TOML_CONTENT)

    # 4. Write src/main.rs
    print("Writing src/main.rs...")
    with open(main_rs_path, "w") as f:
        f.write(MAIN_RS_CONTENT)

    print("\n" + "="*40)
    print("SUCCESS! The Omega System is ready.")
    print("="*40)
    print(f"To run it, type these commands:")
    print(f"cd {PROJECT_NAME}")
    print("cargo run")
    print("="*40)

if __name__ == "__main__":
    setup_project()
