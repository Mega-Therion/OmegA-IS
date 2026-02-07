# Supabase File Sync Setup

This guide explains how to sync your gAIng-brAin files to Supabase for cloud storage and searchability.

## Overview

The file sync system provides:
- **Storage**: Files uploaded to Supabase Storage bucket
- **Database**: Metadata and searchable content in PostgreSQL
- **Classification**: Automatic categorization by agent, type, and purpose
- **Change Detection**: Only uploads modified files
- **Full-Text Search**: Search across all file contents

## Setup Steps

### 1. Run the SQL Schema

First, create the database table:

```bash
# Using Supabase CLI (recommended)
supabase db push

# Or manually run the SQL file in Supabase SQL Editor
# Copy contents of: supabase/files.sql
```

### 2. Create the Storage Bucket

```bash
node scripts/setup-storage-bucket.js
```

This creates the `gaing-files` bucket with:
- Private access (authentication required)
- 50MB file size limit
- Allowed file types: text, code, markdown, images, PDFs

### 3. Sync Your Files

```bash
node scripts/sync-files-to-supabase.js
```

This will:
- Scan all files in gAIng-brAin
- Upload to Supabase Storage
- Create/update database records
- Skip unchanged files (based on content hash)

## File Classification

Files are automatically categorized:

### By Agent
- `CLAUDE.md` → agent: `claude`
- `GEMINI.md` → agent: `gemini`
- `codex.md` → agent: `codex`
- `.claude/` files → agent: `claude`
- `.grok/` files → agent: `grok`

### By Category
- **agent-config**: Agent-specific configuration files
- **protocol**: System protocols (EIDOLON, JARVIS, DAWN, etc.)
- **coordination**: Shared coordination (log.md)
- **documentation**: README, PROJECT_* files
- **script**: PowerShell, batch, shell scripts
- **database**: SQL schema files
- **misc**: Other files

### Shared Files
Files accessible by all agents:
- `log.md` (The Block)
- `CONTEXT.md`
- `EIDOLON.md`
- All documentation
- All scripts

## Database Schema

```sql
-- Key columns:
path              -- Relative file path
name              -- File name
category          -- File classification
agent_name        -- Associated agent (nullable)
is_shared         -- Accessible by all agents
content           -- File content (searchable)
content_hash      -- SHA-256 for change detection
search_vector     -- Generated full-text search index
```

## Searching Files

### SQL Queries

```sql
-- Full-text search
SELECT * FROM search_files('authentication protocol');

-- Get files by category
SELECT * FROM get_files_by_category('protocol');

-- Get agent files
SELECT * FROM get_agent_files('claude');

-- Search content directly
SELECT name, path, category
FROM files
WHERE to_tsvector('english', content) @@ plainto_tsquery('english', 'supabase storage');
```

### JavaScript API

```javascript
const { data, error } = await supabase
  .from('files')
  .select('*')
  .or('category.eq.protocol,category.eq.agent-config')
  .order('updated_at', { ascending: false });
```

## Automation

### Auto-Sync on File Changes

You can set up a file watcher to auto-sync:

```javascript
// Add to your development workflow
const chokidar = require('chokidar');

chokidar.watch('.', {
  ignored: /(node_modules|\.git)/
}).on('change', (path) => {
  // Run sync for changed file
  console.log(`File ${path} changed, syncing...`);
});
```

### Scheduled Sync

Add to `package.json`:

```json
{
  "scripts": {
    "sync:files": "node scripts/sync-files-to-supabase.js",
    "sync:watch": "nodemon --watch . --ext md,js,ps1 --exec npm run sync:files"
  }
}
```

## Excluded Files

The following are NOT synced:
- `node_modules/`
- `.git/` directory
- `.env` files (secrets)
- `.db` files (local databases)
- `package-lock.json`
- Large images (png, jpg, jpeg)
- Temporary files (`.tmp.*`)

## Use Cases

### Agent Memory Sync
Each agent can query their specific files:
```sql
SELECT * FROM get_agent_files('claude');
```

### Protocol Discovery
Find all protocol documents:
```sql
SELECT * FROM files WHERE category = 'protocol';
```

### Change Tracking
See what changed recently:
```sql
SELECT name, path, updated_at
FROM files
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;
```

### Knowledge Search
Search across all documentation:
```sql
SELECT * FROM search_files('vector database embeddings');
```

## Next Steps

1. ✅ Run the setup scripts
2. 📊 Verify files in Supabase Dashboard → Storage → `gaing-files`
3. 🔍 Test queries in SQL Editor
4. 🔄 Set up auto-sync (optional)
5. 🤖 Integrate with agent memory systems

## Troubleshooting

### Missing `.env` variables
Make sure you have:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Permission errors
Use the **service role key** (not anon key) for file uploads.

### Large files
Files over 50MB will be rejected. Adjust bucket settings if needed.

### Content truncation
File content is limited to 50,000 characters in the database. Full files are in Storage.

## API Reference

See `supabase/files.sql` for full schema and helper functions.
