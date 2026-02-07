import express from "express";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadOmegaKeys } from "./src/api/keyLoader.js";

let BetterSqlite3;
let Pg;
try { BetterSqlite3 = (await import("better-sqlite3")).default; } catch {}
try { Pg = await import("pg"); } catch {}

loadOmegaKeys();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const artifactsRoot = path.join(repoRoot, "core", "memory", "artifacts");
const intentsDir = path.join(artifactsRoot, "intents");
const runsDir = path.join(artifactsRoot, "runs");

fs.mkdirSync(intentsDir, { recursive: true });
fs.mkdirSync(runsDir, { recursive: true });

const app = express();
app.use(express.json({ limit: "2mb" }));

// SQLite store
let sqliteDb = null;
if (BetterSqlite3) {
  const sqlitePath = path.join(artifactsRoot, "omega_web.sqlite");
  sqliteDb = new BetterSqlite3(sqlitePath);
  sqliteDb.exec(
    "CREATE TABLE IF NOT EXISTS intents (id TEXT PRIMARY KEY, ts TEXT, payload TEXT)"
  );
  sqliteDb.exec(
    "CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, ts TEXT, payload TEXT)"
  );
  sqliteDb.exec(
    "CREATE TABLE IF NOT EXISTS idempotency (key TEXT PRIMARY KEY, ts TEXT, route TEXT)"
  );
}

// Postgres store
let pgPool = null;
const dbUrl = process.env.DATABASE_URL || process.env.OMEGA_DB_URL || "";
if (Pg && dbUrl) {
  pgPool = new Pg.Pool({ connectionString: dbUrl });
  await pgPool.query(
    "CREATE TABLE IF NOT EXISTS omega_intents (id TEXT PRIMARY KEY, ts TEXT, payload JSONB)"
  );
  await pgPool.query(
    "CREATE TABLE IF NOT EXISTS omega_runs (id TEXT PRIMARY KEY, ts TEXT, payload JSONB)"
  );
  await pgPool.query(
    "CREATE TABLE IF NOT EXISTS omega_idempotency (key TEXT PRIMARY KEY, ts TEXT, route TEXT)"
  );
}

function nowIso() {
  return new Date().toISOString();
}

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

const IntentSchema = z.object({
  id: z.string().optional(),
  intent: z.any().optional(),
  type: z.string().optional()
}).passthrough();

const RunSchema = z.object({
  id: z.string().optional(),
  run: z.any().optional(),
  status: z.string().optional()
}).passthrough();

function validateIntent(body) {
  const r = IntentSchema.safeParse(body);
  return r.success;
}

function validateRun(body) {
  const r = RunSchema.safeParse(body);
  return r.success;
}

function writeFileStore(dir, id, payload) {
  const file = path.join(dir, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
}

async function writePostgres(table, id, ts, payload) {
  if (!pgPool) return;
  await pgPool.query(
    `INSERT INTO ${table} (id, ts, payload) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [id, ts, payload]
  );
}

function writeSqlite(table, id, ts, payload) {
  if (!sqliteDb) return;
  const stmt = sqliteDb.prepare(
    `INSERT OR IGNORE INTO ${table} (id, ts, payload) VALUES (?, ?, ?)`
  );
  stmt.run(id, ts, JSON.stringify(payload));
}

function sqliteHasIdempotency(key) {
  if (!sqliteDb || !key) return false;
  const row = sqliteDb.prepare("SELECT key FROM idempotency WHERE key = ?").get(key);
  return Boolean(row);
}

function sqliteRecordIdempotency(key, route) {
  if (!sqliteDb || !key) return;
  sqliteDb.prepare(
    "INSERT OR IGNORE INTO idempotency (key, ts, route) VALUES (?, ?, ?)"
  ).run(key, nowIso(), route);
}

async function pgHasIdempotency(key) {
  if (!pgPool || !key) return false;
  const res = await pgPool.query("SELECT key FROM omega_idempotency WHERE key = $1", [key]);
  return res.rows.length > 0;
}

async function pgRecordIdempotency(key, route) {
  if (!pgPool || !key) return;
  await pgPool.query(
    "INSERT INTO omega_idempotency (key, ts, route) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING",
    [key, nowIso(), route]
  );
}

async function isDuplicate(idempotencyKey) {
  if (!idempotencyKey) return false;
  if (sqliteHasIdempotency(idempotencyKey)) return true;
  if (await pgHasIdempotency(idempotencyKey)) return true;
  return false;
}

async function recordIdempotency(idempotencyKey, route) {
  if (!idempotencyKey) return;
  sqliteRecordIdempotency(idempotencyKey, route);
  await pgRecordIdempotency(idempotencyKey, route);
}

async function storeIntent(id, payload) {
  const ts = nowIso();
  const record = { id, ts, payload };
  writeFileStore(intentsDir, id, record);
  writeSqlite("intents", id, ts, record);
  await writePostgres("omega_intents", id, ts, record);
}

async function storeRun(id, payload) {
  const ts = nowIso();
  const record = { id, ts, payload };
  writeFileStore(runsDir, id, record);
  writeSqlite("runs", id, ts, record);
  await writePostgres("omega_runs", id, ts, record);
}

function readFromFile(dir, id) {
  const file = path.join(dir, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function readFromSqlite(table, id) {
  if (!sqliteDb) return null;
  const row = sqliteDb.prepare(`SELECT payload FROM ${table} WHERE id = ?`).get(id);
  return row ? JSON.parse(row.payload) : null;
}

async function readFromPostgres(table, id) {
  if (!pgPool) return null;
  const res = await pgPool.query(`SELECT payload FROM ${table} WHERE id = $1`, [id]);
  return res.rows[0]?.payload || null;
}

app.post("/api/intent", async (req, res) => {
  if (!validateIntent(req.body)) {
    return res.status(400).json({ ok: false, error: "invalid intent payload" });
  }
  const idem = req.header("x-idempotency-key") || "";
  if (await isDuplicate(idem)) return res.status(200).json({ ok: true, duplicate: true });
  const id = req.body?.id || `intent_${Date.now()}`;
  await storeIntent(id, req.body || {});
  await recordIdempotency(idem, "/api/intent");
  res.json({ ok: true, id });
});

app.get("/api/status", async (_req, res) => {
  res.json({
    status: "ok",
    stores: {
      sqlite: Boolean(sqliteDb),
      files: true,
      postgres: Boolean(pgPool)
    }
  });
});

app.get("/api/runs/:id", async (req, res) => {
  const id = req.params.id;
  let record = readFromSqlite("runs", id) || readFromFile(runsDir, id);
  if (!record) record = await readFromPostgres("omega_runs", id);
  if (!record) return res.status(404).json({ ok: false, error: "not found" });
  res.json(record);
});

app.post("/api/runs", async (req, res) => {
  if (!validateRun(req.body)) {
    return res.status(400).json({ ok: false, error: "invalid run payload" });
  }
  const idem = req.header("x-idempotency-key") || "";
  if (await isDuplicate(idem)) return res.status(200).json({ ok: true, duplicate: true });
  const id = req.body?.id || `run_${Date.now()}`;
  await storeRun(id, req.body || {});
  await recordIdempotency(idem, "/api/runs");
  res.json({ ok: true, id });
});

app.listen(3000, () => {
  console.log("omega-web listening on :3000");
});
