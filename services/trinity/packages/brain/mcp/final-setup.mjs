#!/usr/bin/env node

/**
 * Final Setup - Comprehensive MCP and Integration Configuration
 * This script will configure everything once keys.env is available
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const MCP_DIR = path.join(__dirname);
const KEYS_ENV = path.join(ROOT_DIR, 'keys.env');

console.log('🚀 Final MCP & Integration Setup');
console.log('=================================\n');

// Try to read keys.env with multiple attempts
function readKeysWithRetry(maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    if (fs.existsSync(KEYS_ENV)) {
      console.log(`✅ Found keys.env (attempt ${i + 1})\n`);
      return readKeys();
    }
    if (i < maxAttempts - 1) {
      // Wait a bit and try again
      const start = Date.now();
      while (Date.now() - start < 500) {} // Simple wait
    }
  }
  return {};
}

function readKeys() {
  const keys = {};
  const content = fs.readFileSync(KEYS_ENV, 'utf8');
  
  console.log('📖 Reading keys from keys.env...\n');
  
  for (const line of content.split('\n')) {
    if (line.trim() && !line.startsWith('#')) {
      let match = line.match(/([^:]+):\s*(.+)/);
      if (!match) match = line.match(/([^=]+)=(.+)/);
      
      if (match) {
        const key = match[1].trim().toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[@]/g, '')
          .replace(/[^a-z0-9_]/g, '');
        const value = match[2].trim();
        
        if (value && value.length > 5 && !value.includes('your-') && value !== 'REDACTED') {
          keys[key] = value;
          console.log(`   ✓ ${key}`);
        }
      }
    }
  }
  
  return keys;
}

function createMCPEnv(keys) {
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
  if (keys.openai_api_key) mcpEnv.OPENAI_API_KEY = keys.openai_api_key;
  if (keys.anthropic_api_key || keys.claude_api_key) {
    mcpEnv.ANTHROPIC_API_KEY = keys.anthropic_api_key || keys.claude_api_key;
  }
  if (keys.gemini_api_key) mcpEnv.GEMINI_API_KEY = keys.gemini_api_key;
  if (keys.grok_api_key) mcpEnv.GROK_API_KEY = keys.grok_api_key;
  if (keys.deepseek_api_key) mcpEnv.DEEPSEEK_API_KEY = keys.deepseek_api_key;
  if (keys.perplexity_api_key) mcpEnv.PERPLEXITY_API_KEY = keys.perplexity_api_key;
  
  // Project Management
  if (keys.linear_api_key) mcpEnv.LINEAR_API_KEY = keys.linear_api_key;
  if (keys.notion_api_key || keys.notion_internal_token) {
    mcpEnv.NOTION_API_KEY = keys.notion_api_key || keys.notion_internal_token;
  }
  
  // Voice
  if (keys.elevenlabs_api_key || keys.eleven_labs_api_key) {
    mcpEnv.ELEVENLABS_API_KEY = keys.elevenlabs_api_key || keys.eleven_labs_api_key;
  }
  
  // Telegram
  const tgKeys = [
    keys.telegram_bot_token,
    keys.telegram_safa_says_bot_token,
    keys.telegram_grok_gaing_bot,
    keys.telegram_claude_gaing_bot_token,
    keys.telegram_gemini_gaing_bot_token,
    keys.telegram_perplexity_gaing_bot_token,
    keys.telegram_codex_gaing_bot_token,
  ].filter(Boolean);
  if (tgKeys.length > 0) mcpEnv.TELEGRAM_BOT_TOKEN = tgKeys[0];
  
  // Databases
  if (process.env.DATABASE_URL) mcpEnv.DATABASE_URL = process.env.DATABASE_URL;
  if (process.env.REDIS_URL) mcpEnv.REDIS_URL = process.env.REDIS_URL;
  if (process.env.MONGODB_URI) mcpEnv.MONGODB_URI = process.env.MONGODB_URI;
  if (process.env.NEO4J_URI) {
    mcpEnv.NEO4J_URI = process.env.NEO4J_URI;
    mcpEnv.NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
    mcpEnv.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
  }
  
  mcpEnv.MCP_TIMEOUT = '30';
  mcpEnv.MCP_LOG_LEVEL = 'info';
  
  return mcpEnv;
}

function writeMCPEnv(mcpEnv) {
  const envPath = path.join(MCP_DIR, '.env');
  const lines = [
    '# MCP Environment Configuration',
    '# Auto-generated from keys.env',
    `# Generated: ${new Date().toISOString()}`,
    ''
  ];
  
  const sections = {
    'Core Services': ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'GITHUB_TOKEN', 'DATABASE_URL'],
    'AI Services': ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GROK_API_KEY', 'DEEPSEEK_API_KEY', 'PERPLEXITY_API_KEY'],
    'Project Management': ['LINEAR_API_KEY', 'NOTION_API_KEY'],
    'Communication': ['TELEGRAM_BOT_TOKEN'],
    'Voice': ['ELEVENLABS_API_KEY'],
    'Databases': ['REDIS_URL', 'MONGODB_URI', 'NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD'],
    'Configuration': ['MCP_TIMEOUT', 'MCP_LOG_LEVEL'],
  };
  
  for (const [cat, vars] of Object.entries(sections)) {
    const active = vars.filter(v => mcpEnv[v]);
    if (active.length > 0) {
      lines.push(`# ${cat}`, '');
      active.forEach(v => lines.push(`${v}=${mcpEnv[v]}`));
      lines.push('');
    }
  }
  
  fs.writeFileSync(envPath, lines.join('\n'));
  return Object.values(mcpEnv).filter(v => v).length;
}

async function main() {
  const keys = readKeysWithRetry();
  const keyCount = Object.keys(keys).length;
  
  if (keyCount === 0) {
    console.log('⚠️  keys.env not found or empty');
    console.log(`   Expected at: ${KEYS_ENV}\n`);
    console.log('   Setting up servers that work without keys...\n');
  } else {
    console.log(`\n📋 Found ${keyCount} keys\n`);
  }
  
  const mcpEnv = createMCPEnv(keys);
  const configured = writeMCPEnv(mcpEnv);
  
  console.log(`✅ Created mcp/.env with ${configured} variables\n`);
  
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
    console.log('   (No servers configured with keys yet)');
  }
  
  console.log('\n📦 Servers Available Without Keys:');
  ['filesystem', 'memory', 'git', 'time', 'fetch', 'sequential-thinking', 'docker', 'terraform', 'playwright', 'puppeteer'].forEach(s => console.log(`   ✅ ${s}`));
  
  console.log(`\n✨ Setup Complete!`);
  console.log(`   Total: ${servers.length + 10} servers ready`);
  if (keyCount > 0) {
    console.log(`   ${servers.length} configured with your keys`);
  }
}

main().catch(console.error);
