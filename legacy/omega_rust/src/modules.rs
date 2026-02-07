//! Phase 3: Sovereign Skill Management (WASM).
use wasmtime::*;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use anyhow::{Result, anyhow};
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct SkillMetadata {
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
}

pub struct Skill {
    pub metadata: SkillMetadata,
    pub module: Module,
    pub path: PathBuf,
}

pub struct ModuleManager {
    engine: Engine,
    skills: Arc<RwLock<HashMap<String, Skill>>>,
}

impl ModuleManager {
    pub fn new() -> Self {
        let config = Config::new();
        
        Self {
            engine: Engine::new(&config).expect("Failed to create Wasmtime engine"),
            skills: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Loads all .wasm files from the specified directory
    pub fn load_skills_from_dir(&self, dir: &Path) -> Result<()> {
        if !dir.exists() {
            std::fs::create_dir_all(dir)?;
        }

        for entry in std::fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("wasm") {
                self.load_skill(&path)?;
            }
        }
        Ok(())
    }

    pub fn load_skill(&self, path: &Path) -> Result<()> {
        let name = path.file_stem().and_then(|s| s.to_str()).unwrap_or("unknown").to_string();
        let module = Module::from_file(&self.engine, path)?;
        
        // Metadata would ideally be embedded in the WASM custom section
        // For Phase 3 initial version, we use a simple naming convention or sidecar file
        let metadata = SkillMetadata {
            name: name.clone(),
            version: "0.1.0".to_string(),
            description: format!("WASM Skill loaded from {:?}", path.file_name().unwrap()),
            author: "ΩmegA".to_string(),
        };

        let skill = Skill {
            metadata,
            module,
            path: path.to_path_buf(),
        };

        let mut skills = self.skills.write().map_err(|_| anyhow!("Lock poisoned"))?;
        skills.insert(name, skill);
        Ok(())
    }

    pub fn list_skills(&self) -> Vec<SkillMetadata> {
        let skills = self.skills.read().unwrap();
        skills.values().map(|s| s.metadata.clone()).collect()
    }

    /// Executes a named skill with a given input
    pub fn run_skill(&self, name: &str, input: i32) -> Result<i32> {
        let skills = self.skills.read().map_err(|_| anyhow!("Lock poisoned"))?;
        let skill = skills.get(name).ok_or_else(|| anyhow!("Skill '{}' not found", name))?;

        let mut store = Store::new(&self.engine, ());
        let linker = Linker::new(&self.engine);
        
        let instance = linker.instantiate(&mut store, &skill.module)?;
        let func = instance.get_typed_func::<i32, i32>(&mut store, "run")?;
        
        let result = func.call(&mut store, input)?;
        Ok(result)
    }

    /// Compiles and executes a human-readable WAT (WebAssembly Text) skill on-the-fly.
    /// Essential for rapid prototyping of physical hardware logic.
    pub fn execute_wat(&self, wat_content: &str, input: i32) -> Result<i32> {
        let module = Module::new(&self.engine, wat_content)?;
        let mut store = Store::new(&self.engine, ());
        let linker = Linker::new(&self.engine);
        
        let instance = linker.instantiate(&mut store, &module)?;
        let func = instance.get_typed_func::<i32, i32>(&mut store, "run")?;
        
        let result = func.call(&mut store, input)?;
        Ok(result)
    }
}