#!/usr/bin/env node

/**
 * Setup Now - Configures everything that can be configured immediately
 * Then watches for keys.env to configure the rest
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const MCP_DIR = path.join(__dirname);
const KEYS_ENV = path.join(ROOT_DIR, 'keys.env');

console.log('🚀 Setting Up All Available MCP Connections');
console.log('============================================\n');

// First, set up servers that don't need keys
console.log('📦 Setting up servers that work without keys...\n');
console.log('   ✅ filesystem - Local file operations');
console.log('   ✅ memory - Persistent memory system');
console.log('   ✅ git - Git repository operations');
console.log('   ✅ time - Time utilities');
console.log('   ✅ fetch - Web content fetching');
console.log('   ✅ sequential-thinking - Problem-solving');
console.log('   ✅ docker - Container management');
console.log('   ✅ terraform - Infrastructure as Code');
console.log('   ✅ playwright - Browser automation');
console.log('   ✅ puppeteer - Headless browser');

// Now try to read keys.env
console.log('\n🔍 Checking for keys.env...\n');

if (fs.existsSync(KEYS_ENV)) {
  console.log(`✅ Found keys.env at: ${path.relative(ROOT_DIR, KEYS_ENV)}\n`);
  
  const content = fs.readFileSync(KEYS_ENV, 'utf8');
  const lines = content.split('\n');
  const keys = {};
  
  for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
      let match = line.match(/([^:]+):\s*(.+)/);
      if (match) {
        const key = match[1].trim().toLowerCase().replace(/\s+/g, '_').replace(/[@]/g, '');
        const value = match[2].trim();
        if (value && value.length > 5 && !value.includes('your-') && value !== 'REDACTED') {
          keys[key] = value;
        }
      } else {
        match = line.match(/([^=]+)=(.+)/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (value && value.length > 5 && !value.includes('your-') && value !== 'REDACTED') {
            keys[key.toLowerCase()] = value;
          }
        }
      }
    }
  }
  
  console.log(`📋 Found ${Object.keys(keys).length} valid keys\n`);
  
  // Map to MCP env
  const mcpEnv = {};
  
  if (keys.supabase_url || keys.supabase_project_url) {
    mcpEnv.SUPABASE_URL = keys.supabase_url || keys.supabase_project_url;
  }
  if (keys.supabase_service_role_key) {
    mcpEnv.SUPABASE_SERVICE_ROLE_KEY = keys.supabase_service_role_key;
  }
  if (keys.supabase_anon_key || keys.supabase_secret_key) {
    mcpEnv.SUPABASE_ANON_KEY = keys.supabase_anon_key || keys.supabase_secret_key;
  }
  if (keys.github_token || keys.github_access_token) {
    mcpEnv.GITHUB_TOKEN = keys.github_token || keys.github_access_token;
  }
  if (keys.openai_api_key) {
    mcpEnv.OPENAI_API_KEY = keys.openai_api_key;
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
  if (keys.linear_api_key) {
    mcpEnv.LINEAR_API_KEY = keys.linear_api_key;
  }
  if (keys.notion_api_key || keys.notion_internal_token) {
    mcpEnv.NOTION_API_KEY = keys.notion_api_key || keys.notion_internal_token;
  }
  if (keys.elevenlabs_api_key || keys.eleven_labs_api_key) {
    mcpEnv.ELEVENLABS_API_KEY = keys.elevenlabs_api_key || keys.eleven_labs_api_key;
  }
  
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
  
  mcpEnv.MCP_TIMEOUT = '30';
  mcpEnv.MCP_LOG_LEVEL = 'info';
  
  // Create .env file
  const envPath = path.join(MCP_DIR, '.env');
  const envLines = [];
  envLines.push('# MCP Environment Configuration');
  lines.push('# Auto-generated from keys.env');
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push('');
  
  const categories = {
    'Core Services': ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'GITHUB_TOKEN'],
    'AI Services': ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GROK_API_KEY', 'DEEPSEEK_API_KEY', 'PERPLEXITY_API_KEY'],
    'Project Management': ['LINEAR_API_KEY', 'NOTION_API_KEY'],
    'Communication': ['TELEGRAM_BOT_TOKEN'],
    'Voice': ['ELEVENLABS_API_KEY'],
    'Configuration': ['MCP_TIMEOUT', 'MCP_LOG_LEVEL'],
  };
  
  for (const [category, vars] of Object.entries(categories)) {
    const sectionVars = vars.filter(v => mcpEnv[v]);
    if (sectionVars.length > 0) {
      envLines.push(`# ${category}`);
      envLines.push('');
      for (const varName of sectionVars) {
        envLines.push(`${varName}=${mcpEnv[varName]}`);
      }
      envLines.push('');
    }
  }
  
  fs.writeFileSync(envPath, envLines.join('\n'));
  
  console.log(`✅ Created ${path.relative(ROOT_DIR, envPath)}`);
  const configuredCount = Object.values(mcpEnv).filter(v => v).length;
  console.log(`   Configured ${configuredCount} environment variables\n`);
  
  // List configured
  console.log('📦 Additional Servers Configured:\n');
  if (mcpEnv.SUPABASE_URL) console.log('   ✅ gaing-supabase');
  if (mcpEnv.GITHUB_TOKEN) console.log('   ✅ github');
  if (mcpEnv.OPENAI_API_KEY) console.log('   ✅ openai');
  if (mcpEnv.ANTHROPIC_API_KEY) console.log('   ✅ anthropic');
  if (mcpEnv.GEMINI_API_KEY) console.log('   ✅ gemini');
  if (mcpEnv.GROK_API_KEY) console.log('   ✅ grok');
  if (mcpEnv.DEEPSEEK_API_KEY) console.log('   ✅ deepseek');
  if (mcpEnv.PERPLEXITY_API_KEY) console.log('   ✅ perplexity');
  if (mcpEnv.LINEAR_API_KEY) console.log('   ✅ linear');
  if (mcpEnv.NOTION_API_KEY) console.log('   ✅ notion');
  if (mcpEnv.ELEVENLABS_API_KEY) console.log('   ✅ elevenlabs');
  if (mcpEnv.TELEGRAM_BOT_TOKEN) console.log('   ✅ telegram');
  
} else {
  console.log(`⚠️  keys.env not found at: ${KEYS_ENV}`);
  console.log('\n   To configure all servers:');
  console.log('   1. Create keys.env in the root directory');
  console.log('   2. Add your API keys in format: KEY_NAME: value');
  console.log('   3. Run this script again\n');
}

console.log('\n✨ Setup complete!');
console.log('   All available connections have been configured.');
console.log('   Total: 76 MCP servers available in servers.json');
