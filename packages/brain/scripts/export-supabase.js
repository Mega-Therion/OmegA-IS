require('dotenv').config();
const fs = require('fs');
const path = require('path');
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

const supabase = createClient(SUPABASE_URL, supabaseKey);

const tables = [
  'members',
  'memories',
  'memory_sources',
  'memory_revisions',
  'memory_votes',
];

const pageSize = 1000;

async function fetchAll(table) {
  let all = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, to);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    const rows = data || [];
    all = all.concat(rows);
    if (rows.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return all;
}

function parseArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx + 1 >= process.argv.length) {
    return null;
  }
  return process.argv[idx + 1];
}

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(');
}

(async () => {
  try {
    const outArg = parseArg('--out');
    const archiveDir = process.env.ARCHIVE_DIR || path.resolve(process.cwd(), 'archive');
    fs.mkdirSync(archiveDir, { recursive: true });

    const timestamp = formatTimestamp(new Date());
    const outPath = outArg
      ? path.resolve(outArg)
      : path.join(archiveDir, `supabase-export-${timestamp}.json`);
    const latestPath = path.join(archiveDir, 'supabase-export-latest.json');

    const payload = {
      exported_at: new Date().toISOString(),
      tables: {},
    };

    for (const table of tables) {
      payload.tables[table] = await fetchAll(table);
    }

    const serialized = JSON.stringify(payload, null, 2);
    fs.writeFileSync(outPath, serialized);
    fs.writeFileSync(latestPath, serialized);

    console.log(`Export complete: ${outPath}`);
  } catch (err) {
    console.error('Export failed:', err.message);
    process.exit(1);
  }
})();
