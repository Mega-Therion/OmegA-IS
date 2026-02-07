use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub enum EntityType {
    Sensor,
    Actuator,
    Grid,
    Robot,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct PhysicalEntity {
    pub id: String,
    pub name: String,
    pub entity_type: EntityType,
    pub signal_strength: u8, // 0-100
    pub status: String,
    pub last_seen: DateTime<Utc>,
    pub capabilities: Vec<String>,
}

pub struct DeviceRegistry {
    entities: Arc<RwLock<HashMap<String, PhysicalEntity>>>,
}

impl DeviceRegistry {
    pub fn new() -> Self {
        let registry = Self {
            entities: Arc::new(RwLock::new(HashMap::new())),
        };
        
        // Initialize with default ARK entities as per Architectural Overview
        registry.register(PhysicalEntity {
            id: "ARK-01".to_string(),
            name: "ONE Natural Energy Grid".to_string(),
            entity_type: EntityType::Grid,
            signal_strength: 98,
            status: "STABLE".to_string(),
            last_seen: Utc::now(),
            capabilities: vec!["power_dist".to_string(), "thermal_monitor".to_string()],
        });
        
        registry
    }

    pub fn register(&self, entity: PhysicalEntity) {
        let mut map = self.entities.write().unwrap();
        map.insert(entity.id.clone(), entity);
    }

    pub fn get_all(&self) -> Vec<PhysicalEntity> {
        let map = self.entities.read().unwrap();
        map.values().cloned().collect()
    }

    /// Simulated discovery pulse
    pub fn discover_entities(&self) {
        // In Phase 3, this would involve UDP scanning or BlueDot bridge checks.
        // For now, we maintain the registry state.
    }

    /// Phase 3: Start a background UDP listener for real IoT device discovery.
    /// Listens for broadcast packets containing entity JSON.
    pub fn start_discovery_listener(self: Arc<Self>) {
        let registry = self.clone();
        tokio::spawn(async move {
            let addr = "0.0.0.0:5000";
            let socket = match tokio::net::UdpSocket::bind(addr).await {
                Ok(s) => s,
                Err(e) => {
                    // If another instance is already running, skip silently to avoid CLI noise.
                    if e.kind() != std::io::ErrorKind::AddrInUse {
                        eprintln!("[DEVICES] Failed to bind discovery port 5000: {}", e);
                    }
                    return;
                }
            };

            println!("[DEVICES] 📡 Discovery listener active on {}", addr);
            let mut buf = [0u8; 1024];

            loop {
                match socket.recv_from(&mut buf).await {
                    Ok((size, src)) => {
                        let data = &buf[..size];
                        if let Ok(entity) = serde_json::from_slice::<PhysicalEntity>(data) {
                            println!("[DEVICES] 🚀 Discovered new entity: {} from {}", entity.name, src);
                            registry.register(entity);
                            
                            // Notify n8n Orchestrator about new physical hardware
                            let _ = registry.notify_n8n_discovery(&src.to_string());
                        }
                    }
                    Err(e) => eprintln!("[DEVICES] UDP Error: {}", e),
                }
            }
        });
    }

    fn notify_n8n_discovery(&self, source_addr: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let client = reqwest::Client::new();
        let payload = serde_json::json!({
            "source": "RustDeviceRegistry",
            "action": "device_discovered",
            "address": source_addr,
            "timestamp": Utc::now().to_rfc3339()
        });

        tokio::spawn(async move {
            let _ = client.post("http://localhost:5678/webhook/omega-orchestrator")
                .json(&payload)
                .send()
                .await;
        });

        Ok(())
    }
}

/// OpenAPI handler to list all devices
#[utoipa::path(
    get,
    path = "/api/devices",
    responses(
        (status = 200, description = "List all discovered devices", body = [PhysicalEntity])
    )
)]
pub async fn get_devices_handler(data: actix_web::web::Data<crate::engine::OmegaEngine>) -> impl actix_web::Responder {
    let devices = data.devices.get_all();
    actix_web::HttpResponse::Ok().json(devices)
}
