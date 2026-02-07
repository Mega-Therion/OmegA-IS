use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub enum EntityType {
    Sensor,
    Actuator,
    Grid,
    Robot,
    Camera,
    Gateway,
    Rover,
    Drone,
    Unknown,
}

/// Telemetry data from sensors and devices
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct TelemetryReading {
    pub timestamp: DateTime<Utc>,
    pub metric: String,
    pub value: f64,
    pub unit: String,
}

/// Robot arm position/state
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema, Default)]
pub struct RobotState {
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub gripper_open: bool,
    pub speed_percent: u8,
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
    #[serde(default)]
    pub telemetry: Vec<TelemetryReading>,
    #[serde(default = "default_max_telemetry")]
    pub max_telemetry_size: usize,
    #[serde(default)]
    pub robot_state: Option<RobotState>,
}

fn default_max_telemetry() -> usize { 100 }

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
            telemetry: vec![TelemetryReading {
                timestamp: Utc::now(),
                metric: "power_output".to_string(),
                value: 1200.5,
                unit: "kW".to_string(),
            }],
            max_telemetry_size: 50,
            robot_state: None,
        });

        // Add a default sensor
        registry.register(PhysicalEntity {
            id: "ARK-SENSOR-01".to_string(),
            name: "Ambient Temperature Sensor".to_string(),
            entity_type: EntityType::Sensor,
            signal_strength: 95,
            status: "ACTIVE".to_string(),
            last_seen: Utc::now(),
            capabilities: vec!["temperature".to_string(), "humidity".to_string()],
            telemetry: vec![
                TelemetryReading {
                    timestamp: Utc::now(),
                    metric: "temperature".to_string(),
                    value: 22.5,
                    unit: "°C".to_string(),
                },
                TelemetryReading {
                    timestamp: Utc::now(),
                    metric: "humidity".to_string(),
                    value: 45.0,
                    unit: "%".to_string(),
                },
            ],
            max_telemetry_size: 100,
            robot_state: None,
        });

        // Add a default drone
        registry.register(PhysicalEntity {
            id: "ARK-DRONE-01".to_string(),
            name: "OmegA Recon Drone".to_string(),
            entity_type: EntityType::Drone,
            signal_strength: 100,
            status: "LANDED".to_string(),
            last_seen: Utc::now(),
            capabilities: vec!["takeoff".to_string(), "land".to_string(), "video_feed".to_string()],
            telemetry: vec![],
            max_telemetry_size: 200,
            robot_state: Some(RobotState::default()),
        });

        registry
    }

    pub fn register(&self, entity: PhysicalEntity) {
        let mut map = self.entities.write().unwrap();
        map.insert(entity.id.clone(), entity);
    }

    pub fn get(&self, id: &str) -> Option<PhysicalEntity> {
        let map = self.entities.read().unwrap();
        map.get(id).cloned()
    }

    pub fn get_all(&self) -> Vec<PhysicalEntity> {
        let map = self.entities.read().unwrap();
        map.values().cloned().collect()
    }

    /// Get latest telemetry reading for a specific metric
    pub fn read_sensor(&self, entity_id: &str, metric: &str) -> Result<TelemetryReading, String> {
        let map = self.entities.read().unwrap();
        if let Some(entity) = map.get(entity_id) {
            entity
                .telemetry
                .iter()
                .filter(|t| t.metric == metric)
                .last()
                .cloned()
                .ok_or_else(|| format!("No {} readings for {}", metric, entity_id))
        } else {
            Err(format!("Entity {} not found.", entity_id))
        }
    }

    /// Record a new telemetry reading
    pub fn push_telemetry(&self, entity_id: &str, reading: TelemetryReading) -> Result<(), String> {
        let mut map = self.entities.write().unwrap();
        if let Some(entity) = map.get_mut(entity_id) {
            entity.last_seen = Utc::now();
            entity.telemetry.push(reading);
            
            // Truncate if over limit
            if entity.telemetry.len() > entity.max_telemetry_size {
                let to_remove = entity.telemetry.len() - entity.max_telemetry_size;
                entity.telemetry.drain(0..to_remove);
            }
            Ok(())
        } else {
            Err(format!("Entity {} not found.", entity_id))
        }
    }

    /// Executes a command on a specific entity.
    /// Supports both simple commands and parameterized commands (e.g., "ARM_MOVE:100,50,200")
    pub fn execute_command(&self, entity_id: &str, command: &str) -> Result<String, String> {
        let mut map = self.entities.write().unwrap();
        if let Some(entity) = map.get_mut(entity_id) {
            entity.last_seen = Utc::now();
            println!("[ARK BUS] Command: {} -> {}", command, entity.id);

            // Parse parameterized commands (format: "CMD:param1,param2,...")
            let (cmd, params): (&str, Option<&str>) = if let Some(idx) = command.find(':') {
                (&command[..idx], Some(&command[idx + 1..]))
            } else {
                (command, None)
            };

            match cmd {
                // === Generic Commands ===
                "REBOOT" => {
                    entity.status = "REBOOTING".to_string();
                    Ok(format!("Entity {} is rebooting.", entity.name))
                }
                "ACTIVATE" => {
                    entity.status = "ACTIVE".to_string();
                    Ok(format!("Entity {} activated.", entity.name))
                }
                "POWER_ON" => {
                    entity.status = "ON".to_string();
                    Ok(format!("Entity {} powered on.", entity.name))
                }
                "POWER_OFF" => {
                    entity.status = "OFF".to_string();
                    Ok(format!("Entity {} powered off.", entity.name))
                }
                "STANDBY" => {
                    entity.status = "STANDBY".to_string();
                    Ok(format!("Entity {} in standby mode.", entity.name))
                }

                // === Robotics Commands ===
                "ARM_MOVE" => {
                    if let Some(coords) = params {
                        let parts: Vec<&str> = coords.split(',').collect();
                        if parts.len() >= 3 {
                            if let (Ok(x), Ok(y), Ok(z)) = (
                                parts[0].parse::<f64>(),
                                parts[1].parse::<f64>(),
                                parts[2].parse::<f64>(),
                            ) {
                                let state = entity.robot_state.get_or_insert(RobotState::default());
                                state.x = x;
                                state.y = y;
                                state.z = z;
                                entity.status = "MOVING".to_string();
                                return Ok(format!(
                                    "Robot arm {} moving to ({}, {}, {})",
                                    entity.name, x, y, z
                                ));
                            }
                        }
                        Err(
                            "ARM_MOVE requires x,y,z coordinates (e.g., ARM_MOVE:100,50,200)"
                                .to_string(),
                        )
                    } else {
                        Err("ARM_MOVE requires coordinates (e.g., ARM_MOVE:100,50,200)".to_string())
                    }
                }
                "ARM_HOME" => {
                    let state = entity.robot_state.get_or_insert(RobotState::default());
                    state.x = 0.0;
                    state.y = 0.0;
                    state.z = 0.0;
                    entity.status = "HOMING".to_string();
                    Ok(format!(
                        "Robot arm {} returning to home position.",
                        entity.name
                    ))
                }
                "GRIP" => {
                    if let Some(state) = &mut entity.robot_state {
                        state.gripper_open = false;
                        Ok(format!("Robot {} gripper closed.", entity.name))
                    } else {
                        entity.robot_state = Some(RobotState {
                            gripper_open: false,
                            ..Default::default()
                        });
                        Ok(format!("Robot {} gripper closed.", entity.name))
                    }
                }
                "RELEASE" => {
                    if let Some(state) = &mut entity.robot_state {
                        state.gripper_open = true;
                        Ok(format!("Robot {} gripper opened.", entity.name))
                    } else {
                        entity.robot_state = Some(RobotState {
                            gripper_open: true,
                            ..Default::default()
                        });
                        Ok(format!("Robot {} gripper opened.", entity.name))
                    }
                }
                "SET_SPEED" => {
                    if let Some(speed_str) = params {
                        if let Ok(speed) = speed_str.parse::<u8>() {
                            let state = entity.robot_state.get_or_insert(RobotState::default());
                            state.speed_percent = speed.min(100);
                            Ok(format!(
                                "Robot {} speed set to {}%.",
                                entity.name,
                                speed.min(100)
                            ))
                        } else {
                            Err("SET_SPEED requires a number 0-100".to_string())
                        }
                    } else {
                        Err("SET_SPEED requires a speed value (e.g., SET_SPEED:50)".to_string())
                    }
                }
                "TAKEOFF" => {
                    entity.status = "AIRBORNE".to_string();
                    if let Some(state) = &mut entity.robot_state {
                        state.z = 10.0; // Default altitude
                    }
                    Ok(format!("Drone {} has taken off.", entity.name))
                }
                "LAND" => {
                    entity.status = "LANDED".to_string();
                    if let Some(state) = &mut entity.robot_state {
                        state.z = 0.0;
                    }
                    Ok(format!("Drone {} has landed.", entity.name))
                }
                "DRIVE" => {
                    entity.status = "DRIVING".to_string();
                    Ok(format!("Rover {} is now driving.", entity.name))
                }

                // === Sensor Commands ===
                "SENSE" => {
                    // Return summary of all telemetry
                    let summary: Vec<String> = entity
                        .telemetry
                        .iter()
                        .map(|t| format!("{}: {} {}", t.metric, t.value, t.unit))
                        .collect();
                    if summary.is_empty() {
                        Ok(format!("No telemetry data for {}.", entity.name))
                    } else {
                        Ok(format!(
                            "Telemetry for {}: {}",
                            entity.name,
                            summary.join(", ")
                        ))
                    }
                }
                "CALIBRATE" => {
                    entity.status = "CALIBRATING".to_string();
                    Ok(format!("Sensor {} calibration initiated.", entity.name))
                }

                _ => Err(format!("Unknown command: {}", cmd)),
            }
        } else {
            Err(format!("Entity {} not found.", entity_id))
        }
    }

    /// Simulated discovery pulse - discovers nearby devices on the ARK bus
    pub fn discover_entities(&self) -> Vec<PhysicalEntity> {
        println!("[ARK BUS] Discovery pulse initiated...");
        let mut map = self.entities.write().unwrap();
        let mut discovered = Vec::new();

        // Simulate discovering a robotic arm
        if !map.contains_key("ARK-ROBOT-01") {
            let robot = PhysicalEntity {
                id: "ARK-ROBOT-01".to_string(),
                name: "OmegA Robotic Arm v1".to_string(),
                entity_type: EntityType::Robot,
                signal_strength: 100,
                status: "IDLE".to_string(),
                last_seen: Utc::now(),
                capabilities: vec![
                    "arm_move".to_string(),
                    "grip".to_string(),
                    "vision_track".to_string(),
                ],
                telemetry: vec![],
                max_telemetry_size: 100,
                robot_state: Some(RobotState::default()),
            };
            map.insert("ARK-ROBOT-01".to_string(), robot.clone());
            discovered.push(robot);
            println!("[ARK BUS] Discovered ARK-ROBOT-01: OmegA Robotic Arm v1");
        }

        // Simulate discovering a camera
        if !map.contains_key("ARK-CAM-01") {
            let camera = PhysicalEntity {
                id: "ARK-CAM-01".to_string(),
                name: "Sovereign Vision Camera".to_string(),
                entity_type: EntityType::Camera,
                signal_strength: 92,
                status: "STREAMING".to_string(),
                last_seen: Utc::now(),
                capabilities: vec![
                    "capture".to_string(),
                    "stream".to_string(),
                    "object_detect".to_string(),
                ],
                telemetry: vec![],
                max_telemetry_size: 100,
                robot_state: None,
            };
            map.insert("ARK-CAM-01".to_string(), camera.clone());
            discovered.push(camera);
            println!("[ARK BUS] Discovered ARK-CAM-01: Sovereign Vision Camera");
        }

        discovered
    }

    /// Get all entities of a specific type
    pub fn get_by_type(&self, entity_type: EntityType) -> Vec<PhysicalEntity> {
        let map = self.entities.read().unwrap();
        map.values()
            .filter(|e| {
                std::mem::discriminant(&e.entity_type) == std::mem::discriminant(&entity_type)
            })
            .cloned()
            .collect()
    }
}
