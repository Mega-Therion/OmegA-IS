//! Revenue tracking and sovereign fund projections for ΩmegΑ.

use serde::{Serialize, Deserialize};
use std::fs;
use anyhow::Result;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RevenueCategory {
    pub name: String,
    pub theoretical_daily_yield: f64,
    pub actual_yield_to_date: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SovereignFund {
    pub categories: Vec<RevenueCategory>,
    pub target_balance: f64,
    pub current_balance: f64,
}

impl Default for SovereignFund {
    fn default() -> Self {
        Self {
            categories: vec![
                RevenueCategory { name: "Technical Consulting".to_string(), theoretical_daily_yield: 5_000_000.0, actual_yield_to_date: 0.0 },
                RevenueCategory { name: "Market Arbitrage".to_string(), theoretical_daily_yield: 3_500_000.0, actual_yield_to_date: 0.0 },
                RevenueCategory { name: "IP & Patents".to_string(), theoretical_daily_yield: 7_200_000.0, actual_yield_to_date: 0.0 },
                RevenueCategory { name: "Legal Services".to_string(), theoretical_daily_yield: 4_300_000.0, actual_yield_to_date: 0.0 },
            ],
            target_balance: 1_000_000_000.0, // 1 Billion Sovereign Goal
            current_balance: 0.0,
        }
    }
}

pub fn load_fund() -> SovereignFund {
    if let Ok(content) = fs::read_to_string("sovereign_fund.json") {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        SovereignFund::default()
    }
}

pub fn save_fund(fund: &SovereignFund) -> Result<()> {
    let content = serde_json::to_string_pretty(fund)?;
    fs::write("sovereign_fund.json", content)?;
    Ok(())
}

pub fn generate_report(fund: &SovereignFund) -> String {
    let mut report = String::from("--- SOVEREIGN REVENUE REPORT ---\
");
    let total_theoretical: f64 = fund.categories.iter().map(|c| c.theoretical_daily_yield).sum();
    
    report.push_str(&format!("Target Goal: ${:.2}\
", fund.target_balance));
    report.push_str(&format!("Current Balance: ${:.2}\
", fund.current_balance));
    report.push_str(&format!("Daily Potential: ${:.2}\
", total_theoretical));
    report.push_str("\nBreakdown:\n");
    
    for cat in &fund.categories {
        report.push_str(&format!("- {}: ${:.2}/day\n", cat.name, cat.theoretical_daily_yield));
    }
    
    let days_to_goal = if total_theoretical > 0.0 {
        (fund.target_balance - fund.current_balance) / total_theoretical
    } else {
        0.0
    };
    
    report.push_str(&format!("\nEstimated days to target: {:.1} days (uninterrupted work).", days_to_goal));
    report
}