//! Revenue tracking and sovereign fund projections for ΩmegΑ.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    pub timestamp: String,
    pub amount: f64,
    pub asset: String,
    pub service: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SovereignTreasury {
    pub did: String,
    pub btc_balance: f64,
    pub ton_balance: f64,
    pub last_updated: String,
    pub history: Vec<Transaction>,
}

impl Default for SovereignTreasury {
    fn default() -> Self {
        Self {
            did: "did:omega:unknown".to_string(),
            btc_balance: 0.0,
            ton_balance: 0.0,
            last_updated: chrono::Utc::now().to_rfc3339(),
            history: vec![],
        }
    }
}

pub fn load_treasury() -> SovereignTreasury {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/home/mega".into());
    let path = std::path::PathBuf::from(home).join("NEXUS/identity/treasury.json");

    if let Ok(content) = fs::read_to_string(path) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        SovereignTreasury::default()
    }
}

pub fn save_treasury(treasury: &SovereignTreasury) -> Result<()> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/home/mega".into());
    let path = std::path::PathBuf::from(home).join("NEXUS/identity/treasury.json");
    let content = serde_json::to_string_pretty(treasury)?;
    fs::write(path, content)?;
    Ok(())
}

pub fn generate_treasury_report(treasury: &SovereignTreasury) -> String {
    let mut report = String::from("--- SOVEREIGN TREASURY REPORT ---\n");
    report.push_str(&format!("DID: {}\n", treasury.did));
    report.push_str(&format!("BTC Balance: {:.8}\n", treasury.btc_balance));
    report.push_str(&format!("TON Balance: {:.2}\n", treasury.ton_balance));
    report.push_str(&format!("Last Updated: {}\n", treasury.last_updated));
    report.push_str("\nRecent Transactions:\n");

    for tx in treasury.history.iter().rev().take(5) {
        report.push_str(&format!(
            "- [{}] {:.2} {} ({})\n",
            tx.timestamp, tx.amount, tx.asset, tx.service
        ));
    }
    report
}
