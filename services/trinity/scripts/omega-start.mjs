#!/usr/bin/env node
/**
 * Omega Trinity launcher
 * Boots the unified Omega services from one command.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Load root .env
config({ path: path.join(repoRoot, ".env") });

const pythonCmd = path.join(repoRoot, ".venv/bin/python");
const isWin = process.platform === "win32";

const services = [
  {
    name: "gateway",
    cwd: path.join(repoRoot, "gateway"),
    cmd: pythonCmd,
    args: [
      "-m",
      "uvicorn",
      "app.main:app",
      "--host",
      process.env.BIND_HOST || "127.0.0.1",
      "--port",
      process.env.GATEWAY_PORT || "8787",
    ],
    env: process.env,
    readyCheck: () => fs.existsSync(path.join(repoRoot, "gateway", "app", "main.py")),
  },
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
    cwd: path.join(repoRoot, "packages", "brain"),
    cmd: "npm",
    args: ["start"],
    env: {
      ...process.env,
      HOST: process.env.HOST || process.env.BIND_HOST || "127.0.0.1",
      PORT: process.env.GAING_PORT || "8080",
      TELEGRAM_AUTOSTART: process.env.TELEGRAM_AUTOSTART || "0",
    },
    readyCheck: () => {
      const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
      const missing = required.filter(key => !process.env[key] || process.env[key].length === 0);
      if (missing.length) {
        console.warn(`[omega] Skipping gAIng-brAin: missing env ${missing.join(", ")}`);
        return false;
      }
      return fs.existsSync(path.join(repoRoot, "packages", "brain", "index.js"));
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
  {
    name: "public-chat",
    cwd: path.join(repoRoot, "packages", "public-chat"),
    cmd: "npm",
    args: ["run", "dev", "--", "-p", process.env.PUBLIC_CHAT_PORT || "3005"],
    env: process.env,
    readyCheck: () => fs.existsSync(path.join(repoRoot, "packages", "public-chat")),
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

console.log("[omega] Services launching.");
console.log("- Gateway: http://localhost:8787");
console.log("- Bridge:  http://localhost:8000");
console.log("- Brain:   http://localhost:8080");
console.log("- Jarvis:  http://localhost:3001");
console.log("- Public:  http://localhost:3005");
