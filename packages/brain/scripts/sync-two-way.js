require('dotenv').config();
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY.');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Using anon key; RLS may block requests.');
}

const dbPath = process.env.LOCAL_DB_PATH || path.resolve(process.cwd(), 'local.db');
const supabase = createClient(SUPABASE_URL, supabaseKey);

const tableConfigs = [
  {
    name: 'members',
    key: (row) => row.user_id,
    conflictKeys: ['user_id'],
    columns: [
      'user_id',
      'owner_id',
      'display_name',
      'regular_name',
      'government_name',
      'company',
      'key_ref',
      'base_url',
      'notes',
      'created_at',
      'updated_at',
    ],
    jsonFields: [],
  },
  {
    name: 'memories',
    key: (row) => row.id,
    conflictKeys: ['id'],
    columns: [
      'id',
      'owner_id',
      'user_id',
      'content',
      'tags',
      'metadata',
      'created_at',
      'updated_at',
    ],
    jsonFields: ['tags', 'metadata'],
  },
  {
    name: 'memory_sources',
    key: (row) => row.id,
    conflictKeys: ['id'],
    columns: [
      'id',
      'memory_id',
      'owner_id',
      'source_type',
      'source_ref',
      'tool',
      'confidence',
      'metadata',
      'created_at',
      'updated_at',
    ],
    jsonFields: ['metadata'],
  },
  {
    name: 'memory_revisions',
    key: (row) => row.id,
    conflictKeys: ['id'],
    columns: [
      'id',
      'memory_id',
      'owner_id',
      'previous_content',
      'new_content',
      'reason',
      'created_at',
      'updated_at',
    ],
    jsonFields: [],
  },
  {
    name: 'memory_votes',
    key: (row) => `${row.memory_id}:${row.owner_id}`,
    conflictKeys: ['memory_id', 'owner_id'],
    columns: [
      'id',
      'memory_id',
      'owner_id',
      'vote',
      'created_at',
      'updated_at',
    ],
    jsonFields: [],
  },
];

function parseTimestamp(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function pickTimestamp(row) {
  return row.updated_at || row.created_at || null;
}

function stableStringify(value) {
  if (value === null || value === undefined) return ';
  if (typeof value !== 'object') return String(value);
  const keys = Object.keys(value).sort();
  const sorted = {};
  for (const key of keys) {
    sorted[key] = value[key];
  }
  return JSON.stringify(sorted);
}

function canonicalRow(row, jsonFields) {
  const copy = { ...row };
  for (const field of jsonFields) {
    if (copy[field] !== null && copy[field] !== undefined) {
      if (typeof copy[field] === 'string') {
        copy[field] = copy[field];
      } else {
        copy[field] = JSON.stringify(copy[field]);
      }
    }
  }
  return stableStringify(copy);
}

function serializeForLocal(row, config) {
  const out = {};
  for (const column of config.columns) {
    let value = row[column];
    if (config.jsonFields.includes(column)) {
      if (value === null || value === undefined) {
        value = null;
      } else {
        value = typeof value === 'string' ? value : JSON.stringify(value);
      }
    }
    // sql.js bind object keys must match placeholders.
    // We will use $key for placeholders.
    out['$' + column] = value === undefined ? null : value;
  }
  return out;
}

function parseJsonField(value, fieldName) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    if (fieldName === 'tags') {
      return trimmed.includes(',')
        ? trimmed.split(',').map((item) => item.trim()).filter(Boolean)
        : [trimmed];
    }
    return null;
  }
}

function deserializeForRemote(row, config) {
  const out = {};
  for (const column of config.columns) {
    let value = row[column];
    if (config.jsonFields.includes(column)) {
      value = parseJsonField(value, column);
    }
    out[column] = value === undefined ? null : value;
  }
  return out;
}

function ensureTablesExist(db) {
  const stmt = db.prepare(
    "select name from sqlite_master where type='table' and name = $name"
  );
  for (const config of tableConfigs) {
    stmt.bind({ $name: config.name });
    if (!stmt.step()) {
        stmt.free();
        console.error(`Missing local table: ${config.name}. Run npm run init:local-db first (or we could auto-create, but adhering to original logic).`);
        // Since we are refactoring, we could potentially auto-init here if sql.js memory db is empty,
        // but the user likely expects persistent state.
        // If file didn't exist, we created an empty DB, so tables are definitely missing.
        console.error('Since this is running in-memory or from a fresh file, you might need to initialize the DB schema if it was empty.');
        process.exit(1);
    }
    stmt.reset();
  }
  stmt.free();
}

function buildLocalUpsertSql(config) {
  const columns = config.columns;
  const conflictKeys = config.conflictKeys;
  const updateColumns = columns.filter((col) => !conflictKeys.includes(col));
  const assignments = updateColumns.map((col) => `${col}=excluded.${col}`).join(', ');
  // Use $column for sql.js placeholders
  const placeholders = columns.map((col) => `$${col}`).join(', ');
  const sql = `
    insert into ${config.name} (${columns.join(', ')})
    values (${placeholders})
    on conflict (${conflictKeys.join(', ')})
    do update set ${assignments}
  `;
  return sql;
}

async function fetchAllRemote(table) {
  const pageSize = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select('*').range(from, to);
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
    const rows = data || [];
    all = all.concat(rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function upsertRemote(table, rows, onConflict) {
  if (!rows.length) return;
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
  }
}

async function syncTable(db, config) {
  const remoteRows = await fetchAllRemote(config.name);
  
  // Fetch all local rows
  const localRows = [];
  const stmt = db.prepare(`select * from ${config.name}`);
  while (stmt.step()) {
      localRows.push(stmt.getAsObject());
  }
  stmt.free();

  const remoteMap = new Map(remoteRows.map((row) => [config.key(row), row]));
  const localMap = new Map(localRows.map((row) => [config.key(row), row]));

  const toRemote = [];
  const toLocal = [];
  
  const keys = new Set([...remoteMap.keys(), ...localMap.keys()]);

  for (const key of keys) {
    const remote = remoteMap.get(key);
    const local = localMap.get(key);

    if (!remote && local) {
      const payload = deserializeForRemote(local, config);
      if (!payload.updated_at) {
        payload.updated_at = payload.created_at || new Date().toISOString();
      }
      toRemote.push(payload);
      continue;
    }

    if (remote && !local) {
      const payload = serializeForLocal(remote, config);
      // Ensure timestamps
      if (!payload['$updated_at']) {
        payload['$updated_at'] = payload['$created_at'] || new Date().toISOString();
      }
      toLocal.push(payload);
      continue;
    }

    if (remote && local) {
      const remoteTs = parseTimestamp(pickTimestamp(remote));
      const localTs = parseTimestamp(pickTimestamp(local));

      if (localTs && (!remoteTs || localTs > remoteTs)) {
        const payload = deserializeForRemote(local, config);
        if (!payload.updated_at) {
          payload.updated_at = payload.created_at || new Date().toISOString();
        }
        toRemote.push(payload);
        continue;
      }

      if (remoteTs && (!localTs || remoteTs > localTs)) {
        const payload = serializeForLocal(remote, config);
        if (!payload['$updated_at']) {
          payload['$updated_at'] = payload['$created_at'] || new Date().toISOString();
        }
        toLocal.push(payload);
        continue;
      }

      const remoteCanonical = canonicalRow(remote, config.jsonFields);
      const localCanonical = canonicalRow(local, config.jsonFields);
      if (remoteCanonical !== localCanonical) {
        const payload = deserializeForRemote(local, config);
        if (!payload.updated_at) {
          payload.updated_at = payload.created_at || new Date().toISOString();
        }
        toRemote.push(payload);
      }
    }
  }

  if (toLocal.length) {
    const sql = buildLocalUpsertSql(config);
    const upsertStmt = db.prepare(sql);
    
    db.run("BEGIN TRANSACTION");
    try {
        for (const row of toLocal) {
            upsertStmt.run(row);
        }
        db.run("COMMIT");
    } catch (e) {
        db.run("ROLLBACK");
        upsertStmt.free();
        throw e;
    }
    upsertStmt.free();
  }

  if (toRemote.length) {
    await upsertRemote(config.name, toRemote, config.conflictKeys.join(','));
  }

  console.log(
    `${config.name}: local->remote ${toRemote.length}, remote->local ${toLocal.length}`
  );
}

(async () => {
  try {
    const SQL = await initSqlJs();
    let db;
    
    if (fs.existsSync(dbPath)) {
        const filebuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(filebuffer);
    } else {
        console.warn('Local DB file not found, creating new one in memory.');
        db = new SQL.Database();
    }

    ensureTablesExist(db);
    
    for (const config of tableConfigs) {
      await syncTable(db, config);
    }
    
    console.log('Two-way sync complete. Saving to disk...');
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    console.log('Saved to', dbPath);
    
  } catch (err) {
    console.error('Two-way sync failed:', err.message);
    process.exit(1);
  }
})();
