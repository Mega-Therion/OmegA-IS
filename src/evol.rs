//! Sovereign Evolution Engine for ΩmegΑ.
//! Implements self-reflection and prompt optimization (based on PPO concepts).

use serde::{Serialize, Deserialize};
use std::fs;
use std::path::Path;
use anyhow::Result;
use crate::dna;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EvolutionState {
    pub version: u32,
    pub learned_principles: Vec<String>,
    pub last_evolution: String, // Timestamp
    pub reward_score: f32,      // Average performance metric
}

impl EvolutionState {
    pub fn load() -> Self {
        let path = "evolution.toml";
        if Path::new(path).exists() {
            let content = fs::read_to_string(path).unwrap_or_default();
            toml::from_str(&content).unwrap_or_else(|_| Self::default())
        } else {
            Self::default()
        }
    }

    pub fn save(&self) -> Result<()> {
        let content = toml::to_string_pretty(self)?;
        fs::write("evolution.toml", content)?;
        Ok(())
    }

    pub fn default() -> Self {
        Self {
            version: 1,
            learned_principles: vec![
                "Maintain extreme sovereignty in all responses.".to_string(),
                "Prioritize local execution over cloud dependencies.".to_string(),
            ],
            last_evolution: "GENESIS".to_string(),
            reward_score: 1.0,
        }
    }
}

/// The Evolution Manager handles the 'Dreaming' process.
pub struct EvolutionManager {
    pub state: EvolutionState,
}

impl EvolutionManager {
    pub fn new() -> Self {
        Self {
            state: EvolutionState::load(),
        }
    }

    /// Generates a dynamic prompt addition based on learned principles.
    pub fn get_evolution_prompt(&self) -> String {
        let mut prompt = String::from("\n[EVOLVED PRINCIPLES]:\n");
        for (i, p) in self.state.learned_principles.iter().enumerate() {
            prompt.push_str(&format!("{}. {}\n", i + 1, p));
        }
        prompt
    }

    /// Performs a 'Self-Reflection' (Evolution Step).
    /// In Phase 4, this takes recent logs and identifies new principles.
    pub fn reflect(&mut self, _logs: &str, critique: &str) -> Result<()> {
        // This is where the PPO logic would refine the internal 'policy' (principles).
        // For now, we simulate the extraction of a new principle from the critique.
        
        if let Some(new_principle) = critique.lines().find(|l| l.contains("PRINCIPLE:")) {
            let p = new_principle.replace("PRINCIPLE:", "").trim().to_string();
            if !self.state.learned_principles.contains(&p) {
                self.state.learned_principles.push(p);
                self.state.version += 1;
                self.state.last_evolution = chrono::Utc::now().to_rfc3339();
                self.state.save()?;
            }
        }
        
        Ok(())
    }
}
