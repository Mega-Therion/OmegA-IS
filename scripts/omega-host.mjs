#!/usr/bin/env node
/**
 * Omega Host Services Launcher
 * Boots the Omega services that run on the host (outside Docker).
 * Excludes the Gateway, Database, and other Dockerized services.
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
    name: "bridge",
    cwd: path.join(repoRoot, "bridge"),
    cmd: pythonCmd,
    args: [
      "-m",
      "uvicorn",
      "api:app",
      "--host",
      process.env.BIND_HOST || "127.0.0.1",
      "--port",
      process.env.COLLECTIVE_PORT || "8000",
    ],
    env: process.env,
    readyCheck: () => fs.existsSync(path.join(repoRoot, "bridge", "api.py")),
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

console.log("[omega] Starting Omega Host Services...");
for (const service of services) {
  startService(service);
}

console.log("[omega] Host services launching.");
console.log("- Bridge:  http://localhost:8000");
console.log("- Brain:   http://localhost:8080");
console.log("- Jarvis:  http://localhost:3001");
