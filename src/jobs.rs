//! Job management for ΩmegΑ.
//! Handles parsing and scheduling of recurring daily missions.

use serde::Deserialize;
use std::fs;
use anyhow::Result;

#[derive(Debug, Clone, Deserialize)]
pub struct JobMetadata {
    pub version: String,
    pub origin: String,
    pub last_dna_sync: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Job {
    pub id: String,
    pub name: String,
    pub priority: String,
    pub description: String,
    pub agents: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct JobsManifest {
    pub metadata: JobMetadata,
    pub jobs: Vec<Job>,
}

pub fn load_jobs() -> Result<JobsManifest> {
    let content = fs::read_to_string("jobs.toml")?;
    let manifest: JobsManifest = toml::from_str(&content)?;
    Ok(manifest)
}
