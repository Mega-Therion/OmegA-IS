//! Cloud synchronization and memory layer for ΩmegΑ (Phase 5).
//! Provides connectivity to Supabase/Postgres.

use postgrest::Postgrest;
use serde_json::json;
use anyhow::Result;
use crate::config::SupabaseConfig;

pub struct CloudClient {
    client: Postgrest,
    enabled: bool,
}

impl CloudClient {
    pub fn new(config: &SupabaseConfig) -> Self {
        let client = Postgrest::new(&config.url)
            .insert_header("apikey", &config.key)
            .insert_header("Authorization", format!("Bearer {}", config.key));
        
        Self {
            client,
            enabled: config.enabled,
        }
    }

    /// Synchronizes a chat message to the cloud.
    pub async fn sync_message(&self, role: &str, content: &str) -> Result<()> {
        if !self.enabled { return Ok(()); }

        let payload = json!({
            "role": role,
            "content": content,
            "created_at": chrono::Utc::now().to_rfc3339(),
        });

        let _resp = self.client
            .from("chat_messages")
            .insert(payload.to_string())
            .execute()
            .await?;

        Ok(())
    }

    /// Synchronizes the evolution state to the cloud.
    pub async fn sync_evolution(&self, version: u32, principles: Vec<String>) -> Result<()> {
        if !self.enabled { return Ok(()); }

        let payload = json!({
            "version": version,
            "principles": principles,
            "updated_at": chrono::Utc::now().to_rfc3339(),
        });

        let _resp = self.client
            .from("evolution_state")
            .insert(payload.to_string())
            .execute()
            .await?;

        Ok(())
    }
}
