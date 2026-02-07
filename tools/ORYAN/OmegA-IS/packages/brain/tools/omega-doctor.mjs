import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import process from "node:process";

const ROOT = process.cwd();

const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const OPTIONAL_ENV = ["LLM_PROVIDER", "OPENAI_API_KEY"];

const SOURCE_EXTS = new Set([
  ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx",
  ".json", ".md", ".yml", ".yaml", ".sh", ".ps1"
]);

const BIDI_AND_HIDDEN = [
  /[\u202A-\u202E\u2066-\u2069]/g, // bidi controls + isolates
  /[\u200B-\u200F\uFEFF]/g,        // zero-width + BOM
];

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket
      .once("connect", () => { socket.destroy(); resolve(true); })
      .once("timeout", () => { socket.destroy(); resolve(false); })
      .once("error", () => { resolve(false); })
      .connect(port, host);
  });
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "dist", "build", ".next", ".cache"].includes(entry.name)) continue;
      walk(full, out);
    } else out.push(full);
  }
  return out;
}

function scanHiddenUnicode(files) {
  const findings = [];
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (!SOURCE_EXTS.has(ext)) continue;

    let text;
    try { text = readText(f); } catch { continue; }

    for (const rx of BIDI_AND_HIDDEN) {
      const m = text.match(rx);
      if (m && m.length) {
        findings.push({
          file: f,
          count: m.length,
          sample: [...new Set(m)].slice(0, 6).join(" ")
        });
        break;
      }
    }
  }
  return findings;
}

function parseDotEnv(dotenvPath) {
  const env = {};
  if (!exists(dotenvPath)) return env;
  const lines = readText(dotenvPath).split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    env[key] = val.replace(/^"(.*)"$/, "$1");
  }
  return env;
}

function printHeader(title) {
  console.log("\n" + "═".repeat(72));
  console.log(title);
  console.log("═".repeat(72));
}

(async function main() {
  printHeader("OMEGA DOCTOR 🩺 — repo diagnostics");

  const nodeVer = process.versions.node;
  console.log(`Node: ${nodeVer}`);
  const [major] = nodeVer.split(".").map(Number);
  if (Number.isFinite(major) && major < 18) {
    console.log("❌ Node 18+ required.");
    process.exitCode = 2;
  } else {
    console.log("✅ Node version OK");
  }

  printHeader("Project files");
  const hasFrontend = exists(path.join(ROOT, "frontend", "package.json"));
  console.log(`frontend/package.json: ${hasFrontend ? "✅" : "❌"}`);

  const dotenvPath = path.join(ROOT, ".env");
  console.log(`.env: ${exists(dotenvPath) ? "✅" : "❌"} (required for Supabase)`);
  const envFromFile = parseDotEnv(dotenvPath);

  printHeader("Environment validation");
  const missing = [];
  for (const k of REQUIRED_ENV) {
    const v = process.env[k] ?? envFromFile[k];
    if (!v) missing.push(k);
  }
  if (missing.length) {
    console.log("❌ Missing required env vars:");
    for (const k of missing) console.log(`  - ${k}`);
    process.exitCode = 2;
  } else {
    console.log("✅ Required env vars present");
  }

  const optionalPresent = OPTIONAL_ENV.filter(k => (process.env[k] ?? envFromFile[k]));
  console.log(`Optional env present: ${optionalPresent.length ? "✅ " + optionalPresent.join(", ") : "—"}`);

  printHeader("Local ports");
  const p8080 = await isPortOpen(8080);
  const p5173 = await isPortOpen(5173);
  console.log(`8080 (backend): ${p8080 ? "OPEN ✅ (something already running)" : "closed —"}`);
  console.log(`5173 (frontend): ${p5173 ? "OPEN ✅ (something already running)" : "closed —"}`);

  printHeader("Hidden/BiDi Unicode scan");
  const files = walk(ROOT);
  const hits = scanHiddenUnicode(files);

  if (!hits.length) {
    console.log("✅ No hidden/bidi characters detected in scanned file types");
  } else {
    console.log(`❌ Found hidden/bidi characters in ${hits.length} file(s):`);
    for (const h of hits.slice(0, 25)) {
      console.log(`- ${h.file} (count≈${h.count}) sample:[${h.sample}]`);
    }
    process.exitCode = 2;
  }

  printHeader("Next actions");
  console.log("1) Fix any ❌ above");
  console.log("2) Start: npm run omega");
  console.log("3) Re-run: npm run omega:doctor");

  if (process.exitCode) process.exit(process.exitCode);
})();
