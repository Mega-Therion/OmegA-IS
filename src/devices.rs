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
}
