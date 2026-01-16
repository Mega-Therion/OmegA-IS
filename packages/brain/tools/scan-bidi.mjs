import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

const SOURCE_EXTS_FAIL = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".json", ".yml", ".yaml"]);
const DOC_EXTS_WARN = new Set([".md", ".txt"]);

const BAD = /[\u202A-\u202E\u2066-\u2069\u200B-\u200F\uFEFF]/g;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (["node_modules", ".git", "dist", "build", ".next", ".cache"].includes(ent.name)) continue;
      walk(full, out);
    } else out.push(full);
  }
  return out;
}

function scanFile(file) {
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch { return null; }
  const m = text.match(BAD);
  if (!m) return null;
  return { file, count: m.length, sample: [...new Set(m)].slice(0, 8).join(" ") };
}

const files = walk(ROOT);

const failHits = [];
const warnHits = [];

for (const f of files) {
  const ext = path.extname(f).toLowerCase();
  if (!SOURCE_EXTS_FAIL.has(ext) && !DOC_EXTS_WARN.has(ext)) continue;

  const hit = scanFile(f);
  if (!hit) continue;

  if (SOURCE_EXTS_FAIL.has(ext)) failHits.push(hit);
  else warnHits.push(hit);
}

if (warnHits.length) {
  console.log(`⚠️  Hidden/bidi chars in docs (${warnHits.length}):`);
  for (const h of warnHits.slice(0, 40)) console.log(`- ${h.file} (≈${h.count}) [${h.sample}]`);
}

if (failHits.length) {
  console.error(`❌ Hidden/bidi chars in source (${failHits.length}):`);
  for (const h of failHits.slice(0, 40)) console.error(`- ${h.file} (≈${h.count}) [${h.sample}]`);
  process.exit(2);
}

console.log("✅ scan-bidi: clean");
