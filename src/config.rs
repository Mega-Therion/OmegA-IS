//! Configuration loader for ΩmegA.
//!
//! The orchestrator can load a capability manifest and user profile at runtime.
//! This controls permissions, visual themes, and AI personality.

use serde::Deserialize;
use std::{env, fs};

/// Capability configuration
#[derive(Debug, Clone, Deserialize)]
pub struct Capabilities {
    /// Permit outbound network requests
    pub allow_network: bool,
    /// Permit reading or writing arbitrary files
    pub allow_filesystem: bool,
    /// Maximum number of concurrent agents
    pub max_parallel_agents: usize,
    /// Enable public-facing restricted mode
    #[serde(default)]
    pub is_public: bool,
    /// URL for the external API Gateway (e.g. Consciousness Core)
    pub gateway_url: Option<String>,
}

impl Default for Capabilities {
    fn default() -> Self {
        Self {
            allow_network: true,
            allow_filesystem: false, // Default to safe
            max_parallel_agents: 3,
            is_public: false,
            gateway_url: Some("http://localhost:8787".to_string()),
        }
    }
}

/// User Personalization Profile
#[derive(Debug, Clone, Deserialize)]
pub struct UserProfile {
    pub pilot_name: String,
    pub theme: String,
    pub assistant_name: String,
}

impl Default for UserProfile {
    fn default() -> Self {
        Self {
            pilot_name: "Pilot".to_string(),
            theme: "cyberpunk".to_string(),
            assistant_name: "ΩmegΑ".to_string(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct SupabaseConfig {
    pub url: String,
    pub key: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct OmegaConfig {
    pub capabilities: Capabilities,
    pub profile: UserProfile,
    #[serde(default)]
    pub supabase: SupabaseConfig,
}

/// Load configuration from a TOML file.
/// Looks for `~/.omega_config.toml` or falls back to defaults.
pub fn load_config(explicit_path: Option<&str>) -> OmegaConfig {
    let config_path = if let Some(p) = explicit_path {
        Some(p.to_string())
    } else {
        env::var("HOME")
            .ok()
            .map(|h| format!("{}/.omega_config.toml", h))
    };

    if let Some(p) = config_path {
        if let Ok(contents) = fs::read_to_string(&p) {
            match toml::from_str::<OmegaConfig>(&contents) {
                Ok(c) => return c,
                Err(_) => {
                    // Try parsing just capabilities for backward compatibility or partial configs
                    if let Ok(mut caps) = toml::from_str::<Capabilities>(&contents) {
                        if caps.gateway_url.is_none() {
                            caps.gateway_url = Some("http://localhost:8787".to_string());
                        }
                        return OmegaConfig {
                            capabilities: caps,
                            profile: UserProfile::default(),
                            supabase: SupabaseConfig::default(),
                        };
                    }
                }
            }
        }
    }

    OmegaConfig::default()
}
