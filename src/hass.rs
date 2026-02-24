use serde::{Deserialize, Serialize};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use anyhow::Result;
use crate::devices::{PhysicalEntity, EntityType, DeviceRegistry, TelemetryReading};
use chrono::Utc;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HassConfig {
    pub url: String,
    pub token: String,
}

#[derive(Clone)]
pub struct HassBridge {
    config: HassConfig,
    client: reqwest::Client,
}

impl HassBridge {
    pub fn new(url: String, token: String) -> Self {
        Self {
            config: HassConfig { url, token },
            client: reqwest::Client::new(),
        }
    }

    pub async fn sync_to_registry(&self, registry: Arc<DeviceRegistry>) -> Result<()> {
        let states = self.get_states().await?;
        if let Some(states_array) = states.as_array() {
            for state in states_array {
                if let Some(entity) = self.map_to_physical_entity(state) {
                    registry.register(entity);
                }
            }
        }
        Ok(())
    }

    async fn get_states(&self) -> Result<serde_json::Value> {
        let mut headers = HeaderMap::new();
        let auth_val = format!("Bearer {}", self.config.token);
        headers.insert(AUTHORIZATION, HeaderValue::from_str(&auth_val)?);

        let url = format!("{}/api/states", self.config.url);
        let resp = self.client.get(&url).headers(headers).send().await?.json().await?;
        Ok(resp)
    }

    pub async fn call_service(&self, domain: &str, service: &str, entity_id: &str) -> Result<serde_json::Value> {
        let mut headers = HeaderMap::new();
        let auth_val = format!("Bearer {}", self.config.token);
        headers.insert(AUTHORIZATION, HeaderValue::from_str(&auth_val)?);

        let url = format!("{}/api/services/{}/{}", self.config.url, domain, service);
        let payload = serde_json::json!({ "entity_id": entity_id });
        
        let resp = self.client.post(&url).headers(headers).json(&payload).send().await?.json().await?;
        Ok(resp)
    }

    pub fn handle_command(&self, entity_id: &str, command: &str) -> Result<String, String> {
        let handle = tokio::runtime::Handle::current();
        
        // Simple mapping: HASS commands usually look like TURN_ON, TURN_OFF
        let service = command.to_lowercase();
        let domain = if entity_id.starts_with("light.") {
            "light"
        } else if entity_id.starts_with("switch.") {
            "switch"
        } else {
            "homeassistant" // Fallback
        };

        let bridge = self.clone();
        let eid = entity_id.to_string();
        let svc = service.clone();
        let dom = domain.to_string();

        match handle.block_on(async move {
            bridge.call_service(&dom, &svc, &eid).await
        }) {
            Ok(_) => Ok(format!("HASS Command {} sent to {}", service, entity_id)),
            Err(e) => Err(format!("HASS Error: {}", e)),
        }
    }

    fn map_to_physical_entity(&self, state: &serde_json::Value) -> Option<PhysicalEntity> {
        let entity_id = state["entity_id"].as_str()?;
        let friendly_name = state["attributes"]["friendly_name"].as_str().unwrap_or(entity_id);
        let entity_state = state["state"].as_str().unwrap_or("unknown");
        
        let entity_type = if entity_id.starts_with("sensor.") {
            EntityType::Sensor
        } else if entity_id.starts_with("light.") || entity_id.starts_with("switch.") {
            EntityType::Actuator
        } else if entity_id.starts_with("camera.") {
            EntityType::Camera
        } else {
            EntityType::Unknown
        };

        let mut capabilities = Vec::new();
        if entity_type == EntityType::Actuator {
            capabilities.push("turn_on".to_string());
            capabilities.push("turn_off".to_string());
        }

        let mut telemetry = Vec::new();
        if let Ok(val) = entity_state.parse::<f64>() {
            let unit = state["attributes"]["unit_of_measurement"].as_str().unwrap_or("");
            telemetry.push(TelemetryReading {
                timestamp: Utc::now(),
                metric: "value".to_string(),
                value: val,
                unit: unit.to_string(),
            });
        }

        Some(PhysicalEntity {
            id: entity_id.to_string(),
            name: friendly_name.to_string(),
            entity_type,
            signal_strength: 100,
            status: entity_state.to_string(),
            last_seen: Utc::now(),
            capabilities,
            telemetry,
            max_telemetry_size: 50,
            robot_state: None,
        })
    }
}
