#!/usr/bin/env node

/**
 * Integration Setup - Sets up all MCP connections and other integrations
 * Reads from keys.env when available
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const MCP_DIR = path.join(__dirname);
const KEYS_ENV = path.join(ROOT_DIR, 'keys.env');

// Read and parse keys.env
function readKeys() {
  if (!fs.existsSync(KEYS_ENV)) {
    return {};
  }
  
  const keys = {};
  const content = fs.readFileSync(KEYS_ENV, 'utf8');
  
  for (const line of content.split('\n')) {
    if (line.trim() && !line.startsWith('#')) {
      const match = line.match(/([^:]+):\s*(.+)/) || line.match(/([^=]+)=(.+)/);
      if (match) {
        const key = match[1].trim().toLowerCase().replace(/\s+/g, '_').replace(/[@]/g, '');
        const value = match[2].trim();
        if (value && value.length > 5 && !value.includes('your-') && value !== 'REDACTED') {
          keys[key] = value;
        }
      }
    }
  }
  
  return keys;
}

// Map keys to MCP environment
function createMCPConfig(keys) {
  const mcpEnv = {};
  
  // Core
  if (keys.supabase_url || keys.supabase_project_url) mcpEnv.SUPABASE_URL = keys.supabase_url || keys.supabase_project_url;
  if (keys.supabase_service_role_key) mcpEnv.SUPABASE_SERVICE_ROLE_KEY = keys.supabase_service_role_key;
  if (keys.supabase_anon_key || keys.supabase_secret_key) mcpEnv.SUPABASE_ANON_KEY = keys.supabase_anon_key || keys.supabase_secret_key;
  if (keys.github_token || keys.github_access_token) mcpEnv.GITHUB_TOKEN = keys.github_token || keys.github_access_token;
  
  // AI
  if (keys.openai_api_key) mcpEnv.OPENAI_API_KEY = keys.openai_api_key;
  if (keys.anthropic_api_key || keys.claude_api_key) mcpEnv.ANTHROPIC_API_KEY = keys.anthropic_api_key || keys.claude_api_key;
  if (keys.gemini_api_key) mcpEnv.GEMINI_API_KEY = keys.gemini_api_key;
  if (keys.grok_api_key) mcpEnv.GROK_API_KEY = keys.grok_api_key;
  if (keys.deepseek_api_key) mcpEnv.DEEPSEEK_API_KEY = keys.deepseek_api_key;
  if (keys.perplexity_api_key) mcpEnv.PERPLEXITY_API_KEY = keys.perplexity_api_key;
  
  // Tools
  if (keys.linear_api_key) mcpEnv.LINEAR_API_KEY = keys.linear_api_key;
  if (keys.notion_api_key || keys.notion_internal_token) mcpEnv.NOTION_API_KEY = keys.notion_api_key || keys.notion_internal_token;
  if (keys.elevenlabs_api_key || keys.eleven_labs_api_key) mcpEnv.ELEVENLABS_API_KEY = keys.elevenlabs_api_key || keys.eleven_labs_api_key;
  
  // Telegram
  const tgKeys = [keys.telegram_bot_token, keys.telegram_safa_says_bot_token, keys.telegram_grok_gaing_bot,
    keys.telegram_claude_gaing_bot_token, keys.telegram_gemini_gaing_bot_token,
    keys.telegram_perplexity_gaing_bot_token, keys.telegram_codex_gaing_bot_token].filter(Boolean);
  if (tgKeys.length > 0) mcpEnv.TELEGRAM_BOT_TOKEN = tgKeys[0];
  
  mcpEnv.MCP_TIMEOUT = '30';
  mcpEnv.MCP_LOG_LEVEL = 'info';
  
  return mcpEnv;
}

// Write MCP .env
function writeMCPEnv(mcpEnv) {
  const envPath = path.join(MCP_DIR, '.env');
  const sections = {
    'Core': ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'GITHUB_TOKEN'],
    'AI': ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GROK_API_KEY', 'DEEPSEEK_API_KEY', 'PERPLEXITY_API_KEY'],
    'Tools': ['LINEAR_API_KEY', 'NOTION_API_KEY'],
    'Voice': ['ELEVENLABS_API_KEY'],
    'Communication': ['TELEGRAM_BOT_TOKEN'],
    'Config': ['MCP_TIMEOUT', 'MCP_LOG_LEVEL'],
  };
  
  const lines = ['# MCP Environment', `# Generated: ${new Date().toISOString()}`, ''];
  
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
  console.log('🚀 Complete Integration Setup');
  console.log('=============================\n');
  
  const keys = readKeys();
  const keyCount = Object.keys(keys).length;
  
  if (keyCount > 0) {
    console.log(`✅ Found ${keyCount} keys in keys.env\n`);
  } else {
    console.log('⚠️  No keys found in keys.env');
    console.log('   Setting up servers that work without keys...\n');
  }
  
  const mcpEnv = createMCPConfig(keys);
  const configured = writeMCPEnv(mcpEnv);
  
  console.log(`✅ MCP .env created with ${configured} variables\n`);
  
  // List configured servers
  const servers = [];
  if (mcpEnv.SUPABASE_URL) servers.push('gaing-supabase');
  if (mcpEnv.GITHUB_TOKEN) servers.push('github');
  if (mcpEnv.OPENAI_API_KEY) servers.push('openai');
  if (mcpEnv.ANTHROPIC_API_KEY) servers.push('anthropic');
  if (mcpEnv.GEMINI_API_KEY) servers.push('gemini');
  if (mcpEnv.GROK_API_KEY) servers.push('grok');
  if (mcpEnv.DEEPSEEK_API_KEY) servers.push('deepseek');
  if (mcpEnv.PERPLEXITY_API_KEY) servers.push('perplexity');
  if (mcpEnv.LINEAR_API_KEY) servers.push('linear');
  if (mcpEnv.NOTION_API_KEY) servers.push('notion');
  if (mcpEnv.ELEVENLABS_API_KEY) servers.push('elevenlabs');
  if (mcpEnv.TELEGRAM_BOT_TOKEN) servers.push('telegram');
  
  console.log('📦 Configured Servers:');
  if (servers.length > 0) {
    servers.forEach(s => console.log(`   ✅ ${s}`));
  } else {
    console.log('   (Add keys to keys.env to enable more servers)');
  }
  
  const noKeyServers = ['filesystem', 'memory', 'git', 'time', 'fetch', 'sequential-thinking', 'docker', 'terraform', 'playwright', 'puppeteer'];
  console.log('\n📦 Servers Available Without Keys:');
  noKeyServers.forEach(s => console.log(`   ✅ ${s}`));
  
  console.log(`\n✨ Total: ${servers.length + noKeyServers.length} servers ready`);
  console.log(`   ${servers.length} configured with your keys`);
  console.log(`   ${noKeyServers.length} work without keys`);
}

main().catch(console.error);
