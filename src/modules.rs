//! Module/Skill management for ΩmegΑ.
//! This allows loading sandboxed WASM modules to extend capabilities
//! as defined in the Architectural Overview.

use crate::devices::DeviceRegistry;
use crate::events::UiEvent;
use anyhow::Result;
use std::fs;
use std::path::Path;
use std::sync::Arc;
use tokio::sync::mpsc;
use wasmtime::*;

pub struct ModuleManager {
    engine: Engine,
    registry: Arc<DeviceRegistry>,
}

impl ModuleManager {
    pub fn new(registry: Arc<DeviceRegistry>) -> Self {
        Self {
            engine: Engine::default(),
            registry,
        }
    }

    /// Lists all available WASM skills in the local 'skills/' directory.
    pub fn list_skills(&self) -> Result<Vec<String>> {
        let skills_dir = Path::new("skills");
        if !skills_dir.exists() {
            fs::create_dir_all(skills_dir)?;
        }

        let mut skills: Vec<String> = Vec::new();
        for entry in fs::read_dir(skills_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().is_some_and(|ext| ext == "wasm") {
                if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                    skills.push(name.to_string());
                }
            }
        }
        Ok(skills)
    }

    /// Load and execute a WASM skill with host-defined capabilities.
    pub fn execute_skill(
        &self,
        path: &Path,
        input: &str,
        ui_tx: Option<mpsc::UnboundedSender<UiEvent>>,
    ) -> Result<String> {
        let module = Module::from_file(&self.engine, path)?;

        // Define the state for the WASM sandbox
        struct SkillState {
            input: String,
            output: String,
            registry: Arc<DeviceRegistry>,
            ui_tx: Option<mpsc::UnboundedSender<UiEvent>>,
        }

        let mut store = Store::new(
            &self.engine,
            SkillState {
                input: input.to_string(),
                output: String::new(),
                registry: self.registry.clone(),
                ui_tx,
            },
        );

        let mut linker = Linker::new(&self.engine);

        // Host Import: get_input(ptr, len)
        linker.func_wrap(
            "omega",
            "get_input",
            |mut caller: Caller<'_, SkillState>, ptr: u32, len: u32| {
                let input_bytes = caller.data().input.as_bytes().to_vec();
                let mem = caller
                    .get_export("memory")
                    .and_then(|e| e.into_memory())
                    .unwrap();
                if input_bytes.len() <= len as usize {
                    mem.write(&mut caller, ptr as usize, &input_bytes).unwrap();
                }
            },
        )?;

        // Host Import: set_output(ptr, len)
        linker.func_wrap(
            "omega",
            "set_output",
            |mut caller: Caller<'_, SkillState>, ptr: u32, len: u32| {
                let mem = caller
                    .get_export("memory")
                    .and_then(|e| e.into_memory())
                    .unwrap();
                let mut buf = vec![0u8; len as usize];
                mem.read(&caller, ptr as usize, &mut buf).unwrap();
                caller.data_mut().output = String::from_utf8_lossy(&buf).to_string();
            },
        )?;

        // Host Import: log(ptr, len)
        linker.func_wrap(
            "omega",
            "log",
            |mut caller: Caller<'_, SkillState>, ptr: u32, len: u32| {
                let mem = caller
                    .get_export("memory")
                    .and_then(|e| e.into_memory())
                    .unwrap();
                let mut buf = vec![0u8; len as usize];
                mem.read(&caller, ptr as usize, &mut buf).unwrap();
                println!("[WASM LOG] {}", String::from_utf8_lossy(&buf));
            },
        )?;

        // Host Import: ark_bus_command(id_ptr, id_len, cmd_ptr, cmd_len)
        linker.func_wrap(
            "omega",
            "ark_bus_command",
            |mut caller: Caller<'_, SkillState>,
             id_ptr: u32,
             id_len: u32,
             cmd_ptr: u32,
             cmd_len: u32| {
                let mem = caller
                    .get_export("memory")
                    .and_then(|e| e.into_memory())
                    .unwrap();

                let mut id_buf = vec![0u8; id_len as usize];
                mem.read(&caller, id_ptr as usize, &mut id_buf).unwrap();
                let id = String::from_utf8_lossy(&id_buf).to_string();

                let mut cmd_buf = vec![0u8; cmd_len as usize];
                mem.read(&caller, cmd_ptr as usize, &mut cmd_buf).unwrap();
                let cmd = String::from_utf8_lossy(&cmd_buf).to_string();

                let registry = caller.data().registry.clone();
                match registry.execute_command(&id, &cmd) {
                    Ok(msg) => println!("[WASM ARK BUS SUCCESS] {}", msg),
                    Err(e) => println!("[WASM ARK BUS ERROR] {}", e),
                }
            },
        )?;

        // Host Import: ark_read_sensor(id_ptr, id_len, metric_ptr, metric_len, out_ptr, out_len) -> i32
        // Returns the number of bytes written, or -1 on error
        linker.func_wrap(
            "omega",
            "ark_read_sensor",
            |mut caller: Caller<'_, SkillState>,
             id_ptr: u32,
             id_len: u32,
             metric_ptr: u32,
             metric_len: u32,
             out_ptr: u32,
             out_len: u32|
             -> i32 {
                let mem = caller
                    .get_export("memory")
                    .and_then(|e| e.into_memory())
                    .unwrap();

                let mut id_buf = vec![0u8; id_len as usize];
                mem.read(&caller, id_ptr as usize, &mut id_buf).unwrap();
                let id = String::from_utf8_lossy(&id_buf).to_string();

                let mut metric_buf = vec![0u8; metric_len as usize];
                mem.read(&caller, metric_ptr as usize, &mut metric_buf)
                    .unwrap();
                let metric = String::from_utf8_lossy(&metric_buf).to_string();

                let registry = caller.data().registry.clone();
                match registry.read_sensor(&id, &metric) {
                    Ok(reading) => {
                        let result = format!("{} {}", reading.value, reading.unit);
                        let bytes = result.as_bytes();
                        if bytes.len() <= out_len as usize {
                            mem.write(&mut caller, out_ptr as usize, bytes).unwrap();
                            bytes.len() as i32
                        } else {
                            -1 // Buffer too small
                        }
                    }
                    Err(_) => -1,
                }
            },
        )?;

        // Host Import: get_all_devices(out_ptr, out_len) -> i32
        linker.func_wrap(
            "omega",
            "get_all_devices",
            |mut caller: Caller<'_, SkillState>, out_ptr: u32, out_len: u32| -> i32 {
                let devices = caller.data().registry.get_all();
                let json = serde_json::to_string(&devices).unwrap_or_else(|_| "[]".to_string());
                let bytes = json.as_bytes();

                let mem = caller
                    .get_export("memory")
                    .and_then(|e| e.into_memory())
                    .unwrap();

                if bytes.len() <= out_len as usize {
                    if mem.write(&mut caller, out_ptr as usize, bytes).is_err() {
                        return -1;
                    }
                    bytes.len() as i32
                } else {
                    -1
                }
            },
        )?;

        // Host Import: ui_broadcast(ptr, len)
        linker.func_wrap(
            "omega",
            "ui_broadcast",
            |mut caller: Caller<'_, SkillState>, ptr: u32, len: u32| {
                let mem = caller
                    .get_export("memory")
                    .and_then(|e| e.into_memory())
                    .unwrap();
                let mut buf = vec![0u8; len as usize];
                if mem.read(&caller, ptr as usize, &mut buf).is_ok() {
                    let msg = String::from_utf8_lossy(&buf).to_string();
                    if let Some(tx) = &caller.data().ui_tx {
                        let _ = tx.send(UiEvent::Output(msg));
                    }
                }
            },
        )?;

        let instance = linker.instantiate(&mut store, &module)?;
        let func = instance.get_typed_func::<(), ()>(&mut store, "run")?;

        func.call(&mut store, ())?;

        let output = store.data().output.clone();
        Ok(if output.is_empty() {
            format!("Skill at {:?} executed successfully.", path)
        } else {
            output
        })
    }
}
