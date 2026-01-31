//! Phase 6: Voice HUD (Eleven Labs Integration).
use reqwest::Client;
use serde_json::json;
use anyhow::Result;
use std::fs::File;
use std::io::Write;

pub struct VoiceManager {
    client: Client,
    api_key: String,
    voice_id: String, // Default voice
}

impl VoiceManager {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            voice_id: "pNInz6obpgnuMscayW9L".to_string(), // Default: Adam
        }
    }

    /// Generates speech from text and saves it to a temporary file.
    pub async fn synthesize(&self, text: &str, output_path: &str) -> Result<()> {
        let url = format!("https://api.elevenlabs.io/v1/text-to-speech/{}", self.voice_id);
        
        let res = self.client.post(url)
            .header("xi-api-key", &self.api_key)
            .json(&json!({
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.5
                }
            }))
            .send()
            .await?;

        if res.status().is_success() {
            let bytes = res.bytes().await?;
            let mut file = File::create(output_path)?;
            file.write_all(&bytes)?;
            Ok(())
        } else {
            let err = res.text().await?;
            anyhow::bail!("ElevenLabs Error: {}", err)
        }
    }
}
