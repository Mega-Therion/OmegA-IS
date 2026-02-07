#!/usr/bin/env node

/**
 * Helper script to create keys.env from keys.yaml
 * This helps migrate from the YAML format to the env format
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const KEYS_YAML = path.join(ROOT_DIR, 'keys.yaml');
const KEYS_ENV = path.join(ROOT_DIR, 'keys.env');

function main() {
  console.log('🔑 Creating keys.env from keys.yaml\n');
  
  if (!fs.existsSync(KEYS_YAML)) {
    console.error('❌ keys.yaml not found!');
    console.error(`   Expected at: ${KEYS_YAML}`);
    return;
  }
  
  const content = fs.readFileSync(KEYS_YAML, 'utf8');
  const lines = content.split('\n');
  
  const keys = [];
  let inKeysSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // Look for key: value format
    const match = trimmed.match(/([^:]+):\s*(.+)/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      
      // Skip REDACTED values
      if (value && value !== 'REDACTED' && !value.includes('your-')) {
        keys.push({ key, value });
      }
    }
  }
  
  if (keys.length === 0) {
    console.warn('⚠️  No valid keys found in keys.yaml');
    console.warn('   All values appear to be REDACTED or placeholders');
    console.warn('\n   Please manually create keys.env with your actual keys');
    return;
  }
  
  // Create keys.env content
  const envLines = [];
  envLines.push('# Keys Environment File');
  envLines.push('# Generated from keys.yaml');
  envLines.push(`# Generated: ${new Date().toISOString()}`);
  envLines.push('');
  envLines.push('# Copy this file and replace REDACTED values with your actual keys');
  envLines.push('');
  
  for (const { key, value } of keys) {
    envLines.push(`${key}: ${value}`);
  }
  
  // Write file
  if (fs.existsSync(KEYS_ENV)) {
    console.log('⚠️  keys.env already exists!');
    console.log('   Backing up to keys.env.backup');
    fs.copyFileSync(KEYS_ENV, KEYS_ENV + '.backup');
  }
  
  fs.writeFileSync(KEYS_ENV, envLines.join('\n') + '\n');
  
  console.log(`✅ Created ${path.relative(ROOT_DIR, KEYS_ENV)}`);
  console.log(`   Found ${keys.length} keys`);
  console.log('\n📝 Next steps:');
  console.log('   1. Edit keys.env and replace any REDACTED values');
  console.log('   2. Run: npm run mcp:setup');
  console.log('   3. Your MCP servers will be configured!');
}

main();
