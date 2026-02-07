#!/usr/bin/env node

/**
 * Sync gAIng-brAin Files to Supabase
 * Uploads files to Storage and indexes metadata in the database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'gaing-files';
const ROOT_DIR = path.join(__dirname, '..');

// Files to exclude from sync
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git\//,
  /\.tmp\./,
  /package-lock\.json$/,
  /\.env$/,
  /\.db$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/
];

// File categorization rules
const FILE_CATEGORIES = {
  'CLAUDE.md': { category: 'agent-config', agent: 'claude', shared: false },
  'GEMINI.md': { category: 'agent-config', agent: 'gemini', shared: false },
  'codex.md': { category: 'agent-config', agent: 'codex', shared: false },
  'EIDOLON.md': { category: 'protocol', agent: null, shared: true },
  'JARVIS.md': { category: 'protocol', agent: null, shared: true },
  'log.md': { category: 'coordination', agent: null, shared: true },
  'CONTEXT.md': { category: 'documentation', agent: null, shared: true },
  'README.md': { category: 'documentation', agent: null, shared: true },
  'COMMUNICATION.md': { category: 'protocol', agent: null, shared: true }
};

// Classify file by extension
function getFileTypeByExtension(ext) {
  const types = {
    '.md': 'markdown',
    '.js': 'javascript',
    '.ps1': 'powershell',
    '.bat': 'batch',
    '.sh': 'shell',
    '.json': 'json',
    '.sql': 'sql',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.txt': 'text',
    '.env': 'env'
  };
  return types[ext] || 'unknown';
}

// Classify file category
function classifyFile(fileName, relativePath) {
  // Check explicit mappings first
  if (FILE_CATEGORIES[fileName]) {
    return FILE_CATEGORIES[fileName];
  }

  // Classify by path patterns
  if (relativePath.includes('scripts/')) return { category: 'script', agent: null, shared: true };
  if (relativePath.includes('supabase/')) return { category: 'database', agent: null, shared: true };
  if (relativePath.includes('.claude/')) return { category: 'agent-config', agent: 'claude', shared: false };
  if (relativePath.includes('.grok/')) return { category: 'agent-config', agent: 'grok', shared: false };
  if (relativePath.includes('docs/')) return { category: 'documentation', agent: null, shared: true };

  // Classify by filename patterns
  if (fileName.startsWith('PROJECT_')) return { category: 'documentation', agent: null, shared: true };
  if (fileName.includes('PROTOCOL')) return { category: 'protocol', agent: null, shared: true };
  if (fileName.includes('SETUP')) return { category: 'documentation', agent: null, shared: true };
  if (fileName.endsWith('.bat') || fileName.endsWith('.ps1')) return { category: 'script', agent: null, shared: true };

  // Default
  return { category: 'misc', agent: null, shared: true };
}

// Calculate SHA-256 hash
function calculateHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Get MIME type
function getMimeType(ext) {
  const mimes = {
    '.md': 'text/markdown',
    '.js': 'application/javascript',
    '.ps1': 'application/x-powershell',
    '.bat': 'application/x-bat',
    '.sh': 'application/x-sh',
    '.json': 'application/json',
    '.sql': 'application/sql',
    '.yml': 'text/yaml',
    '.txt': 'text/plain'
  };
  return mimes[ext] || 'application/octet-stream';
}

// Check if file should be excluded
function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

// Recursively get all files
async function getAllFiles(dir, baseDir = dir) {
  const files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (shouldExclude(relativePath)) continue;

    if (item.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else {
      files.push({ fullPath, relativePath });
    }
  }

  return files;
}

// Upload file to storage and create database record
async function syncFile(fileInfo) {
  const { fullPath, relativePath } = fileInfo;

  try {
    // Read file
    const stats = await fs.stat(fullPath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const contentHash = calculateHash(content);

    const ext = path.extname(fullPath);
    const fileName = path.basename(fullPath);
    const fileType = getFileTypeByExtension(ext);
    const classification = classifyFile(fileName, relativePath);

    // Check if file already exists in DB with same hash
    const { data: existing } = await supabase
      .from('files')
      .select('content_hash')
      .eq('path', relativePath)
      .single();

    if (existing && existing.content_hash === contentHash) {
      console.log(`⏭️  Skipped (unchanged): ${relativePath}`);
      return { status: 'skipped', path: relativePath };
    }

    // Upload to storage
    const storagePath = relativePath.replace(/\\/g, '/');
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, content, {
        contentType: getMimeType(ext),
        upsert: true
      });

    if (uploadError) {
      console.error(`❌ Upload error (${relativePath}):`, uploadError.message);
      return { status: 'error', path: relativePath, error: uploadError.message };
    }

    // Upsert to database
    const { error: dbError } = await supabase
      .from('files')
      .upsert({
        path: relativePath,
        name: fileName,
        extension: ext,
        storage_bucket: BUCKET_NAME,
        storage_path: storagePath,
        file_type: fileType,
        size_bytes: stats.size,
        mime_type: getMimeType(ext),
        content: content.substring(0, 50000), // Limit content size
        content_hash: contentHash,
        category: classification.category,
        agent_name: classification.agent,
        is_shared: classification.shared,
        file_modified_at: stats.mtime.toISOString(),
        last_synced_at: new Date().toISOString()
      }, {
        onConflict: 'path'
      });

    if (dbError) {
      console.error(`❌ DB error (${relativePath}):`, dbError.message);
      return { status: 'error', path: relativePath, error: dbError.message };
    }

    console.log(`✅ Synced: ${relativePath}`);
    return { status: 'success', path: relativePath };

  } catch (error) {
    console.error(`❌ Error processing ${relativePath}:`, error.message);
    return { status: 'error', path: relativePath, error: error.message };
  }
}

// Main sync function
async function syncAllFiles() {
  console.log('🚀 Starting gAIng file sync to Supabase...\n');
  console.log(`📁 Root directory: ${ROOT_DIR}\n`);

  try {
    // Get all files
    console.log('📂 Scanning files...');
    const files = await getAllFiles(ROOT_DIR);
    console.log(`📊 Found ${files.length} files to process\n`);

    // Sync each file
    const results = {
      success: 0,
      skipped: 0,
      error: 0
    };

    for (const file of files) {
      const result = await syncFile(file);
      results[result.status]++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Sync Summary:');
    console.log(`   ✅ Synced: ${results.success}`);
    console.log(`   ⏭️  Skipped: ${results.skipped}`);
    console.log(`   ❌ Errors: ${results.error}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run
syncAllFiles();
