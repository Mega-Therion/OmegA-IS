#!/usr/bin/env node

/**
 * Comprehensive MCP Configuration Script
 * Reads keys from multiple sources and configures all possible MCP servers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const MCP_DIR = path.join(__dirname);
const BRAIN_DIR = path.join(__dirname, '..');

// Try multiple key file locations
const KEY_FILES = [
  path.join(ROOT_DIR, 'keys.env'),
  path.join(MCP_DIR, 'keys.env'),
  path.join(BRAIN_DIR, 'keys.env'),
  path.join(ROOT_DIR, 'keys.yaml'),
];

// Read keys from all possible sources
function readAllKeys() {
  const keys = {};
  
  // Try reading from key files
  for (const keyFile of KEY_FILES) {
    if (fs.existsSync(keyFile)) {
      console.log(`📖 Reading from ${path.relative(ROOT_DIR, keyFile)}...`);
      const content = fs.readFileSync(keyFile, 'utf8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
          // Try KEY: value format
          let match = line.match(/([^:]+):\s*(.+)/);
          if (match) {
            const key = match[1].trim().toLowerCase().replace(/\s+/g, '_').replace(/[@]/g, '');
            let value = match[2].trim();
            // Remove "REDACTED" or placeholder values
            if (value && value !== 'REDACTED' && !value.includes('your-') && !value.includes('REDACTED')) {
              keys[key] = value;
            }
          } else {
            // Try KEY=value format
            match = line.match(/([^=]+)=(.+)/);
            if (match) {
              const key = match[1].trim();
              const value = match[2].trim();
              if (value && value !== 'REDACTED' && !value.includes('your-')) {
                keys[key.toLowerCase()] = value;
              }
            }
          }
        }
      }
    }
  }
  
  // Try reading from .env files (simple parser)
  const envFiles = [
    path.join(BRAIN_DIR, '.env'),
    path.join(BRAIN_DIR, '.env.2026'),
    path.join(ROOT_DIR, '.env'),
  ];
  
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      console.log(`📖 Reading from ${path.relative(ROOT_DIR, envFile)}...`);
      const content = fs.readFileSync(envFile, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
          const match = line.match(/([^=]+)=(.+)/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            if (value && !value.includes('your-') && value !== 'REDACTED') {
              keys[key.toLowerCase()] = value;
            }
          }
        }
      }
    }
  }
  
  // Also read from process.env
  const envKeys = [
    'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY',
    'GITHUB_TOKEN', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_API_KEY',
    'GEMINI_API_KEY', 'GROK_API_KEY', 'DEEPSEEK_API_KEY', 'PERPLEXITY_API_KEY',
    'LINEAR_API_KEY', 'NOTION_API_KEY', 'ELEVENLABS_API_KEY', 'TELEGRAM_BOT_TOKEN',
    'DATABASE_URL', 'REDIS_URL', 'MONGODB_URI', 'NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD',
  ];
  
  for (const key of envKeys) {
    if (process.env[key] && !keys[key.toLowerCase()]) {
      keys[key.toLowerCase()] = process.env[key];
    }
  }
  
  return keys;
}

// Map all keys to MCP environment variables
function mapAllKeysToMCP(keys) {
  const mcpEnv = {};
  
  // Normalize key names
  const normalized = {};
  for (const [key, value] of Object.entries(keys)) {
    const normalizedKey = key.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[@]/g, '')
      .replace(/[^a-z0-9_]/g, '');
    normalized[normalizedKey] = value;
  }
  
  // Supabase
  if (normalized.supabase_url || normalized.supabase_project_url) {
    mcpEnv.SUPABASE_URL = normalized.supabase_url || normalized.supabase_project_url;
  }
  if (normalized.supabase_service_role_key) {
    mcpEnv.SUPABASE_SERVICE_ROLE_KEY = normalized.supabase_service_role_key;
  }
  if (normalized.supabase_anon_key || normalized.supabase_secret_key) {
    mcpEnv.SUPABASE_ANON_KEY = normalized.supabase_anon_key || normalized.supabase_secret_key;
  }
  
  // GitHub
  if (normalized.github_token || normalized.github_access_token) {
    mcpEnv.GITHUB_TOKEN = normalized.github_token || normalized.github_access_token;
  }
  
  // AI Services
  if (normalized.openai_api_key || normalized.openai_service_role_key) {
    mcpEnv.OPENAI_API_KEY = normalized.openai_api_key || normalized.openai_service_role_key;
  }
  if (normalized.anthropic_api_key || normalized.claude_api_key) {
    mcpEnv.ANTHROPIC_API_KEY = normalized.anthropic_api_key || normalized.claude_api_key;
  }
  if (normalized.gemini_api_key) {
    mcpEnv.GEMINI_API_KEY = normalized.gemini_api_key;
  }
  if (normalized.grok_api_key) {
    mcpEnv.GROK_API_KEY = normalized.grok_api_key;
  }
  if (normalized.deepseek_api_key) {
    mcpEnv.DEEPSEEK_API_KEY = normalized.deepseek_api_key;
  }
  if (normalized.perplexity_api_key) {
    mcpEnv.PERPLEXITY_API_KEY = normalized.perplexity_api_key;
  }
  
  // Project Management
  if (normalized.linear_api_key) {
    mcpEnv.LINEAR_API_KEY = normalized.linear_api_key;
  }
  if (normalized.notion_api_key || normalized.notion_internal_token) {
    mcpEnv.NOTION_API_KEY = normalized.notion_api_key || normalized.notion_internal_token;
  }
  
  // Voice
  if (normalized.elevenlabs_api_key || normalized.eleven_labs_api_key) {
    mcpEnv.ELEVENLABS_API_KEY = normalized.elevenlabs_api_key || normalized.eleven_labs_api_key;
  }
  
  // Communication - Telegram (use first available token)
  const telegramKeys = [
    normalized.telegram_bot_token,
    normalized.telegram_safa_says_bot_token,
    normalized.telegram_grok_gaing_bot,
    normalized.telegram_claude_gaing_bot_token,
    normalized.telegram_gemini_gaing_bot_token,
    normalized.telegram_perplexity_gaing_bot_token,
    normalized.telegram_codex_gaing_bot_token,
  ].filter(Boolean);
  
  if (telegramKeys.length > 0) {
    mcpEnv.TELEGRAM_BOT_TOKEN = telegramKeys[0];
  }
  
  // Databases
  if (normalized.database_url || process.env.DATABASE_URL) {
    mcpEnv.DATABASE_URL = normalized.database_url || process.env.DATABASE_URL;
  }
  if (normalized.redis_url || process.env.REDIS_URL) {
    mcpEnv.REDIS_URL = normalized.redis_url || process.env.REDIS_URL;
  }
  if (normalized.mongodb_uri || process.env.MONGODB_URI) {
    mcpEnv.MONGODB_URI = normalized.mongodb_uri || process.env.MONGODB_URI;
  }
  if (normalized.neo4j_uri || process.env.NEO4J_URI) {
    mcpEnv.NEO4J_URI = normalized.neo4j_uri || process.env.NEO4J_URI;
    mcpEnv.NEO4J_USER = normalized.neo4j_user || process.env.NEO4J_USER || 'neo4j';
    mcpEnv.NEO4J_PASSWORD = normalized.neo4j_password || process.env.NEO4J_PASSWORD;
  }
  
  // Defaults
  mcpEnv.MCP_TIMEOUT = process.env.MCP_TIMEOUT || '30';
  mcpEnv.MCP_LOG_LEVEL = process.env.MCP_LOG_LEVEL || 'info';
  
  return mcpEnv;
}

// Create comprehensive MCP .env file
function createMCPEnv(mcpEnv) {
  const envPath = path.join(MCP_DIR, '.env');
  
  const sections = {
    'Core Services': [
      'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY',
      'GITHUB_TOKEN', 'DATABASE_URL'
    ],
    'AI Services': [
      'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY',
      'GROK_API_KEY', 'DEEPSEEK_API_KEY', 'PERPLEXITY_API_KEY'
    ],
    'Project Management': [
      'LINEAR_API_KEY', 'NOTION_API_KEY'
    ],
    'Communication': [
      'TELEGRAM_BOT_TOKEN'
    ],
    'Voice': [
      'ELEVENLABS_API_KEY'
    ],
    'Databases': [
      'REDIS_URL', 'MONGODB_URI', 'NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD'
    ],
    'Configuration': [
      'MCP_TIMEOUT', 'MCP_LOG_LEVEL'
    ]
  };
  
  const lines = [];
  lines.push('# MCP Environment Configuration');
  lines.push('# Auto-generated - DO NOT EDIT MANUALLY');
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push('');
  
  for (const [section, vars] of Object.entries(sections)) {
    const sectionVars = vars.filter(v => mcpEnv[v]);
    if (sectionVars.length > 0) {
      lines.push(`# ${section}`);
      lines.push('');
      for (const varName of sectionVars) {
        lines.push(`${varName}=${mcpEnv[varName]}`);
      }
      lines.push('');
    }
  }
  
  fs.writeFileSync(envPath, lines.join('\n'));
  console.log(`✅ Created ${path.relative(ROOT_DIR, envPath)}`);
  
  const configuredCount = Object.values(mcpEnv).filter(v => v).length;
  console.log(`   Configured ${configuredCount} environment variables\n`);
}

// Main execution
function main() {
  console.log('🚀 Comprehensive MCP Configuration');
  console.log('==================================\n');
  
  const keys = readAllKeys();
  console.log(`\n📋 Found ${Object.keys(keys).length} total keys\n`);
  
  const mcpEnv = mapAllKeysToMCP(keys);
  createMCPEnv(mcpEnv);
  
  // List configured servers
  console.log('📦 Configured MCP Servers:\n');
  const servers = [];
  
  if (mcpEnv.SUPABASE_URL) servers.push({ name: 'gaing-supabase', status: '✅' });
  if (mcpEnv.GITHUB_TOKEN) servers.push({ name: 'github', status: '✅' });
  if (mcpEnv.OPENAI_API_KEY) servers.push({ name: 'openai', status: '✅' });
  if (mcpEnv.ANTHROPIC_API_KEY) servers.push({ name: 'anthropic', status: '✅' });
  if (mcpEnv.GEMINI_API_KEY) servers.push({ name: 'gemini', status: '✅' });
  if (mcpEnv.GROK_API_KEY) servers.push({ name: 'grok', status: '✅' });
  if (mcpEnv.DEEPSEEK_API_KEY) servers.push({ name: 'deepseek', status: '✅' });
  if (mcpEnv.PERPLEXITY_API_KEY) servers.push({ name: 'perplexity', status: '✅' });
  if (mcpEnv.LINEAR_API_KEY) servers.push({ name: 'linear', status: '✅' });
  if (mcpEnv.NOTION_API_KEY) servers.push({ name: 'notion', status: '✅' });
  if (mcpEnv.ELEVENLABS_API_KEY) servers.push({ name: 'elevenlabs', status: '✅' });
  if (mcpEnv.TELEGRAM_BOT_TOKEN) servers.push({ name: 'telegram', status: '✅' });
  if (mcpEnv.DATABASE_URL) servers.push({ name: 'postgres', status: '✅' });
  if (mcpEnv.REDIS_URL) servers.push({ name: 'redis', status: '✅' });
  if (mcpEnv.MONGODB_URI) servers.push({ name: 'mongodb', status: '✅' });
  if (mcpEnv.NEO4J_URI) servers.push({ name: 'neo4j', status: '✅' });
  
  if (servers.length > 0) {
    servers.forEach(s => console.log(`   ${s.status} ${s.name}`));
  } else {
    console.log('   ⚠️  No servers configured (add keys to keys.env)');
  }
  
  console.log('\n📦 Servers Available Without Keys:');
  const noKeyServers = [
    'filesystem', 'memory', 'git', 'time', 'fetch',
    'sequential-thinking', 'docker', 'terraform', 'playwright', 'puppeteer'
  ];
  noKeyServers.forEach(s => console.log(`   ✅ ${s}`));
  
  console.log('\n✨ Configuration complete!');
  console.log(`   Total: ${servers.length + noKeyServers.length} servers available`);
}

main();
