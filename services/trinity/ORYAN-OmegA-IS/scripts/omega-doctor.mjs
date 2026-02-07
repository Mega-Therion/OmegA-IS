#!/usr/bin/env node
/**
 * Omega Trinity diagnostics
 * - Builds a component manifest for the monorepo
 * - Validates env + entry points
 * - Inventories scripts for synthesis/automation
 */

import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".cache",
]);

const COMPONENTS = [
  {
    id: "gateway",
    label: "Gateway (FastAPI)",
    path: "gateway",
    entryFiles: ["app/main.py"],
    start: "python -m uvicorn app.main:app --host 0.0.0.0 --port 8787",
    envRequired: ["OMEGA_BRAIN_BASE_URL"],
    envOptional: ["OMEGA_INTERNAL_TOKEN", "OMEGA_OPENAI_API_KEY"],
    ports: [8787],
  },
  {
    id: "bridge",
    label: "Bridge (FastAPI)",
    path: "bridge",
    entryFiles: ["api.py"],
    start: "python -m uvicorn api:app --host 127.0.0.1 --port 8000",
    envRequired: [],
    envOptional: ["OPENAI_API_KEY", "GITHUB_TOKEN", "REDIS_URL"],
    ports: [8000],
  },
  {
    id: "gaing-brain",
    label: "gAIng-brAin (Node)",
    path: "gAIng-brAin",
    entryFiles: ["index.js", "package.json"],
    start: "npm start",
    envRequired: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    envOptional: ["OPENAI_API_KEY", "LLM_PROVIDER", "MEM0_API_KEY"],
    ports: [8080],
  },
  {
    id: "jarvis",
    label: "Jarvis (Next.js)",
    path: "Jarvis",
    entryFiles: ["package.json"],
    start: "npm run dev",
    envRequired: [],
    envOptional: [
      "GAING_BRAIN_URL",
      "OMEGA_GATEWAY_URL",
      "OMEGA_API_BEARER_TOKEN",
    ],
    ports: [3001],
  },
  {
    id: "hud",
    label: "Portal HUD (Vite + React)",
    path: "client",
    entryFiles: ["src/main.tsx", "package.json"],
    start: "pnpm dev",
    envRequired: [],
    envOptional: ["VITE_APP_ID", "OAUTH_SERVER_URL"],
    ports: [5173],
  },
  {
    id: "server",
    label: "Portal server (Express + tRPC)",
    path: "server",
    entryFiles: ["_core/index.ts"],
    start: "pnpm dev",
    envRequired: ["DATABASE_URL", "JWT_SECRET"],
    envOptional: ["OWNER_OPEN_ID", "BUILT_IN_FORGE_API_URL"],
    ports: [3100],
  },
  {
    id: "n8n",
    label: "n8n workflows",
    path: "n8n",
    entryFiles: ["docker-compose.yml", "README.md"],
    start: "docker compose up n8n",
    envRequired: [],
    envOptional: ["N8N_ONBOARDING_WEBHOOK"],
    ports: [5678],
  },
  {
    id: "prometheus",
    label: "Prometheus",
    path: "prometheus",
    entryFiles: ["prometheus.yml"],
    start: "docker compose up prometheus",
    envRequired: [],
    envOptional: [],
    ports: [9090],
  },
  {
    id: "nginx",
    label: "Nginx",
    path: "nginx",
    entryFiles: ["nginx.conf"],
    start: "docker compose up nginx",
    envRequired: [],
    envOptional: [],
    ports: [80],
  },
];

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
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

function formatList(items) {
  if (!items.length) return "—";
  return items.join(", ");
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function collectScripts() {
  const files = walk(repoRoot);
  const scriptFiles = files.filter(file =>
    /\.(mjs|cjs|js|ts|tsx|sh|ps1)$/i.test(file),
  );
  const byDir = new Map();
  for (const file of scriptFiles) {
    const rel = path.relative(repoRoot, file);
    const topDir = rel.split(path.sep)[0] ?? "";
    const list = byDir.get(topDir) ?? [];
    list.push(rel);
    byDir.set(topDir, list);
  }
  return { scriptFiles, byDir };
}

function resolveEnvValue(key, envFromFile) {
  return process.env[key] ?? envFromFile[key] ?? "";
}

function checkPorts(ports, host = "127.0.0.1") {
  const checks = ports.map(
    port =>
      new Promise(resolve => {
        const socket = new net.Socket();
        socket.setTimeout(600);
        socket
          .once("connect", () => {
            socket.destroy();
            resolve({ port, open: true });
          })
          .once("timeout", () => {
            socket.destroy();
            resolve({ port, open: false });
          })
          .once("error", () => resolve({ port, open: false }))
          .connect(port, host);
      }),
  );
  return Promise.all(checks);
}

(async function main() {
  printHeader("OMEGA DOCTOR 🩺 — synthesis diagnostics");

  console.log(`Repo root: ${repoRoot}`);
  console.log(`Node: ${process.versions.node}`);

  const dotenvPath = path.join(repoRoot, ".env");
  const envFromFile = parseDotEnv(dotenvPath);
  console.log(`.env present: ${exists(dotenvPath) ? "✅" : "❌"}`);

  printHeader("Component manifest");
  for (const component of COMPONENTS) {
    const absPath = path.join(repoRoot, component.path);
    const present = exists(absPath);
    console.log(`\n${component.label}`);
    console.log(`- Path: ${component.path} ${present ? "✅" : "❌"}`);
    if (present) {
      const missingEntries = component.entryFiles.filter(
        entry => !exists(path.join(absPath, entry)),
      );
      console.log(
        `- Entry files: ${missingEntries.length ? "❌" : "✅"} ${formatList(
          component.entryFiles,
        )}`,
      );
      if (missingEntries.length) {
        console.log(`  Missing: ${formatList(missingEntries)}`);
      }
    }

    const missingEnv = component.envRequired.filter(
      key => !resolveEnvValue(key, envFromFile),
    );
    console.log(
      `- Env required: ${missingEnv.length ? "❌" : "✅"} ${formatList(
        component.envRequired,
      )}`,
    );
    if (missingEnv.length) {
      console.log(`  Missing: ${formatList(missingEnv)}`);
    }
    const optionalPresent = component.envOptional.filter(key =>
      resolveEnvValue(key, envFromFile),
    );
    console.log(
      `- Env optional: ${optionalPresent.length ? "✅" : "—"} ${formatList(
        optionalPresent,
      )}`,
    );
    console.log(`- Start: ${component.start}`);
  }

  printHeader("Script inventory");
  const { scriptFiles, byDir } = collectScripts();
  console.log(`Total scripts: ${scriptFiles.length}`);
  for (const [dir, files] of [...byDir.entries()].sort()) {
    const sample = files.slice(0, 6).join(", ");
    const suffix = files.length > 6 ? ` (+${files.length - 6} more)` : "";
    console.log(`- ${dir || "."}: ${sample}${suffix}`);
  }

  const portSet = new Set();
  COMPONENTS.forEach(component => component.ports.forEach(p => portSet.add(p)));
  const ports = [...portSet].sort((a, b) => a - b);

  printHeader("Local port scan");
  const portChecks = await checkPorts(ports);
  for (const { port, open } of portChecks) {
    console.log(`${port}: ${open ? "OPEN ✅" : "closed —"}`);
  }

  printHeader("Next actions");
  console.log("1) Ensure .env is populated (see .env.example)");
  console.log("2) Install deps: pnpm install");
  console.log("3) Start stack: pnpm omega");
  console.log("4) Health check: pnpm omega:smoke");
  console.log("5) Re-run diagnostics: pnpm omega:doctor");
})();
