#!/usr/bin/env node

/**
 * Full MCP Setup - Reads keys from all possible sources and configures everything
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const MCP_DIR = path.join(__dirname);
const BRAIN_DIR = path.join(__dirname, '..');

// All possible key file locations
const KEY_LOCATIONS = [
  path.join(ROOT_DIR, 'keys.env'),
  path.join(MCP_DIR, 'keys.env'),
  path.join(BRAIN_DIR, 'keys.env'),
  path.join(ROOT_DIR, 'keys.yaml'),
  path.join(BRAIN_DIR, '.env'),
  path.join(BRAIN_DIR, '.env.2026'),
  path.join(ROOT_DIR, '.env'),
];

function readKeysFromFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  
  const keys = {};
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
      // Try KEY: value format
      let match = line.match(/([^:]+):\s*(.+)/);
      if (match) {
        const key = match[1].trim().toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[@]/g, '')
          .replace(/[^a-z0-9_]/g, '');
        const value = match[2].trim();
        if (value && value !== 'REDACTED' && !value.includes('your-') && value.length > 5) {
          keys[key] = value;
        }
      } else {
        // Try KEY=value format
        match = line.match(/([^=]+)=(.+)/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (value && value !== 'REDACTED' && !value.includes('your-') && value.length > 5) {
            keys[key.toLowerCase()] = value;
          }
        }
      }
    }
  }
  
  return keys;
}

function readAllKeys() {
  const allKeys = {};
  
  console.log('🔍 Searching for keys in multiple locations...\n');
  
  // Read from all possible files
  for (const filePath of KEY_LOCATIONS) {
    if (fs.existsSync(filePath)) {
      const relPath = path.relative(ROOT_DIR, filePath);
      console.log(`📖 Reading: ${relPath}`);
      const keys = readKeysFromFile(filePath);
      Object.assign(allKeys, keys);
      if (Object.keys(keys).length > 0) {
        console.log(`   Found ${Object.keys(keys).length} keys`);
      }
    }
  }
  
  // Also read from process.env
  const envVars = [
    'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY',
    'GITHUB_TOKEN', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_API_KEY',
    'GEMINI_API_KEY', 'GROK_API_KEY', 'DEEPSEEK_API_KEY', 'PERPLEXITY_API_KEY',
    'LINEAR_API_KEY', 'NOTION_API_KEY', 'ELEVENLABS_API_KEY', 'TELEGRAM_BOT_TOKEN',
    'DATABASE_URL', 'REDIS_URL', 'MONGODB_URI', 'NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD',
  ];
  
  for (const key of envVars) {
    if (process.env[key] && !allKeys[key.toLowerCase()]) {
      allKeys[key.toLowerCase()] = process.env[key];
    }
  }
  
  return allKeys;
}

function mapKeysToMCP(keys) {
  const mcpEnv = {};
  
  // Supabase
  if (keys.supabase_url || keys.supabase_project_url) {
    mcpEnv.SUPABASE_URL = keys.supabase_url || keys.supabase_project_url;
  }
  if (keys.supabase_service_role_key) {
    mcpEnv.SUPABASE_SERVICE_ROLE_KEY = keys.supabase_service_role_key;
  }
  if (keys.supabase_anon_key || keys.supabase_secret_key) {
    mcpEnv.SUPABASE_ANON_KEY = keys.supabase_anon_key || keys.supabase_secret_key;
  }
  
  // GitHub
  if (keys.github_token || keys.github_access_token) {
    mcpEnv.GITHUB_TOKEN = keys.github_token || keys.github_access_token;
  }
  
  // AI Services
  if (keys.openai_api_key || keys.openai_service_role_key) {
    mcpEnv.OPENAI_API_KEY = keys.openai_api_key || keys.openai_service_role_key;
  }
  if (keys.anthropic_api_key || keys.claude_api_key) {
    mcpEnv.ANTHROPIC_API_KEY = keys.anthropic_api_key || keys.claude_api_key;
  }
  if (keys.gemini_api_key) {
    mcpEnv.GEMINI_API_KEY = keys.gemini_api_key;
  }
  if (keys.grok_api_key) {
    mcpEnv.GROK_API_KEY = keys.grok_api_key;
  }
  if (keys.deepseek_api_key) {
    mcpEnv.DEEPSEEK_API_KEY = keys.deepseek_api_key;
  }
  if (keys.perplexity_api_key) {
    mcpEnv.PERPLEXITY_API_KEY = keys.perplexity_api_key;
  }
  
  // Project Management
  if (keys.linear_api_key) {
    mcpEnv.LINEAR_API_KEY = keys.linear_api_key;
  }
  if (keys.notion_api_key || keys.notion_internal_token) {
    mcpEnv.NOTION_API_KEY = keys.notion_api_key || keys.notion_internal_token;
  }
  
  // Voice
  if (keys.elevenlabs_api_key || keys.eleven_labs_api_key) {
    mcpEnv.ELEVENLABS_API_KEY = keys.elevenlabs_api_key || keys.eleven_labs_api_key;
  }
  
  // Communication - Telegram (use first available)
  const telegramKeys = [
    keys.telegram_bot_token,
    keys.telegram_safa_says_bot_token,
    keys.telegram_grok_gaing_bot,
    keys.telegram_claude_gaing_bot_token,
    keys.telegram_gemini_gaing_bot_token,
    keys.telegram_perplexity_gaing_bot_token,
    keys.telegram_codex_gaing_bot_token,
  ].filter(Boolean);
  
  if (telegramKeys.length > 0) {
    mcpEnv.TELEGRAM_BOT_TOKEN = telegramKeys[0];
  }
  
  // Databases
  if (keys.database_url) {
    mcpEnv.DATABASE_URL = keys.database_url;
  }
  if (keys.redis_url) {
    mcpEnv.REDIS_URL = keys.redis_url;
  }
  if (keys.mongodb_uri) {
    mcpEnv.MONGODB_URI = keys.mongodb_uri;
  }
  if (keys.neo4j_uri) {
    mcpEnv.NEO4J_URI = keys.neo4j_uri;
    mcpEnv.NEO4J_USER = keys.neo4j_user || 'neo4j';
    mcpEnv.NEO4J_PASSWORD = keys.neo4j_password;
  }
  
  // Defaults
  mcpEnv.MCP_TIMEOUT = '30';
  mcpEnv.MCP_LOG_LEVEL = 'info';
  
  return mcpEnv;
}

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
  return envPath;
}

function main() {
  console.log('🚀 Full MCP Setup');
  console.log('==================\n');
  
  const keys = readAllKeys();
  console.log(`\n📋 Total keys found: ${Object.keys(keys).length}\n`);
  
  if (Object.keys(keys).length === 0) {
    console.warn('⚠️  No keys found in any location!');
    console.warn('\n   Please create keys.env in the root directory with your API keys.');
    console.warn('   Format: KEY_NAME: value');
    console.warn('   Example: supabase project url: https://your-project.supabase.co');
    return;
  }
  
  const mcpEnv = mapKeysToMCP(keys);
  const envPath = createMCPEnv(mcpEnv);
  
  console.log(`✅ Created ${path.relative(ROOT_DIR, envPath)}`);
  const configuredCount = Object.values(mcpEnv).filter(v => v).length;
  console.log(`   Configured ${configuredCount} environment variables\n`);
  
  // List configured servers
  console.log('📦 Configured MCP Servers:\n');
  const servers = [];
  
  if (mcpEnv.SUPABASE_URL) servers.push('✅ gaing-supabase');
  if (mcpEnv.GITHUB_TOKEN) servers.push('✅ github');
  if (mcpEnv.OPENAI_API_KEY) servers.push('✅ openai');
  if (mcpEnv.ANTHROPIC_API_KEY) servers.push('✅ anthropic');
  if (mcpEnv.GEMINI_API_KEY) servers.push('✅ gemini');
  if (mcpEnv.GROK_API_KEY) servers.push('✅ grok');
  if (mcpEnv.DEEPSEEK_API_KEY) servers.push('✅ deepseek');
  if (mcpEnv.PERPLEXITY_API_KEY) servers.push('✅ perplexity');
  if (mcpEnv.LINEAR_API_KEY) servers.push('✅ linear');
  if (mcpEnv.NOTION_API_KEY) servers.push('✅ notion');
  if (mcpEnv.ELEVENLABS_API_KEY) servers.push('✅ elevenlabs');
  if (mcpEnv.TELEGRAM_BOT_TOKEN) servers.push('✅ telegram');
  if (mcpEnv.DATABASE_URL) servers.push('✅ postgres');
  if (mcpEnv.REDIS_URL) servers.push('✅ redis');
  if (mcpEnv.MONGODB_URI) servers.push('✅ mongodb');
  if (mcpEnv.NEO4J_URI) servers.push('✅ neo4j');
  
  if (servers.length > 0) {
    servers.forEach(s => console.log(`   ${s}`));
  } else {
    console.log('   ⚠️  No servers configured yet');
  }
  
  console.log('\n📦 Servers Available Without Keys:');
  const noKeyServers = [
    'filesystem', 'memory', 'git', 'time', 'fetch',
    'sequential-thinking', 'docker', 'terraform', 'playwright', 'puppeteer'
  ];
  noKeyServers.forEach(s => console.log(`   ✅ ${s}`));
  
  console.log(`\n✨ Setup complete!`);
  console.log(`   Total: ${servers.length + noKeyServers.length} servers available`);
  console.log(`   Configured: ${servers.length} servers with your keys`);
}

main();
