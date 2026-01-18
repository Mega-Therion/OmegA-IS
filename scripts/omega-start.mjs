#!/usr/bin/env node
/**
 * Omega Trinity launcher
 * Boots the three legacy Omega services from one command.
 * - Portal (this repo) -> http://localhost:3100
 * - Jarvis Neuro-Link -> http://localhost:3001
 * - CollectiveBrain API -> http://localhost:8000
 * - gAIng-brAin -> http://localhost:8080 (requires Supabase env)
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const pythonCmd = process.env.PYTHON_CMD || "python";
const isWin = process.platform === "win32";

const services = [
  {
    name: "portal",
    cwd: repoRoot,
    cmd: "pnpm",
    args: ["dev"],
    env: {
      ...process.env,
      PORT: process.env.PORT || "3100",
    },
    readyCheck: () => true,
  },
  {
    name: "jarvis",
    cwd: path.join(repoRoot, "Jarvis"),
    cmd: "npm",
    args: ["run", "dev"],
    env: {
      ...process.env,
      PORT: process.env.JARVIS_PORT || "3001",
    },
    readyCheck: () => fs.existsSync(path.join(repoRoot, "Jarvis")),
  },
  {
    name: "collectivebrain",
    cwd: path.join(repoRoot, "CollectiveBrain_V1"),
    cmd: pythonCmd,
    args: [
      "-m",
      "uvicorn",
      "api:app",
      "--host",
      "0.0.0.0",
      "--port",
      process.env.COLLECTIVE_PORT || "8000",
    ],
    env: process.env,
    readyCheck: () => fs.existsSync(path.join(repoRoot, "CollectiveBrain_V1", "api.py")),
  },
  {
    name: "gaing-brain",
    cwd: path.join(repoRoot, "gAIng-brAin"),
    cmd: "npm",
    args: ["start"],
    env: {
      ...process.env,
      PORT: process.env.GAING_PORT || "8080",
    },
    readyCheck: () => {
      const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
      const missing = required.filter(key => !process.env[key] || process.env[key].length === 0);
      if (missing.length) {
        console.warn(`[omega] Skipping gAIng-brAin: missing env ${missing.join(", ")}`);
        return false;
      }
      return fs.existsSync(path.join(repoRoot, "gAIng-brAin", "index.js"));
    },
  },
];

const children = [];

function log(name, message) {
  process.stdout.write(`[${name}] ${message}`);
}

function startService(service) {
  if (!service.readyCheck()) {
    console.warn(`[omega] Service ${service.name} not started (missing files or env).`);
    return;
  }

  const child = spawn(service.cmd, service.args, {
    cwd: service.cwd,
    env: service.env,
    shell: isWin,
    stdio: ["ignore", "pipe", "pipe"],
  });

  children.push({ name: service.name, child });

  child.stdout?.on("data", data => log(service.name, data.toString()));
  child.stderr?.on("data", data => log(service.name, data.toString()));
  child.on("close", code => log(service.name, `exited with code ${code ?? "unknown"}\n`));
  child.on("error", err => log(service.name, `failed to start: ${err.message}\n`));
}

function shutdown() {
  console.log("\n[omega] Shutting down services...");
  for (const { child, name } of children) {
    try {
      child.kill("SIGTERM");
      console.log(`[omega] Sent SIGTERM to ${name}`);
    } catch (err) {
      console.error(`[omega] Failed to stop ${name}:`, err);
    }
  }
  process.exit();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("[omega] Starting Omega Trinity stack...");
for (const service of services) {
  startService(service);
}

console.log("[omega] Services launching. Portal: http://localhost:3100 | Jarvis: http://localhost:3001 | CollectiveBrain API: http://localhost:8000 | gAIng-brAin: http://localhost:8080");
