#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const { URL } = require("url");
const dotenv = require("dotenv");

const TELEGRAM_HOST = "api.telegram.org";
const DEFAULT_AGENTS = ["codex", "gemini", "claude", "grok", "perplexity", "deepseek", "kimi"];
const DEFAULT_WEBHOOK_PATH_PREFIX = "/telegram/webhook";

loadEnvFromConventions();

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exit(1);
});

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const action = args.action || "get";
  if (!["set", "get", "delete"].includes(action)) {
    throw new Error(`Invalid --action '${action}'. Expected one of: set, get, delete.`);
  }

  const agents = resolveAgents(args);
  if (agents.length === 0) {
    throw new Error("No agents selected.");
  }

  const webhookBaseUrl = args.baseUrl || process.env.TELEGRAM_WEBHOOK_BASE_URL;
  const webhookPathPrefix = normalizePathPrefix(
    args.pathPrefix || process.env.TELEGRAM_WEBHOOK_PATH_PREFIX || DEFAULT_WEBHOOK_PATH_PREFIX
  );
  const dropPendingUpdates = Boolean(args.dropPendingUpdates);

  if (action === "set") {
    validateUrl(webhookBaseUrl, "TELEGRAM_WEBHOOK_BASE_URL or --base-url");
  }

  console.log(`[info] action=${action} agents=${agents.join(",")} dryRun=${Boolean(args.dryRun)}`);

  const failures = [];

  for (const agent of agents) {
    try {
      await runForAgent({
        agent,
        action,
        dryRun: Boolean(args.dryRun),
        webhookBaseUrl,
        webhookPathPrefix,
        dropPendingUpdates,
      });
    } catch (error) {
      failures.push(`${agent}: ${error.message}`);
      console.error(`[fail] ${agent}: ${error.message}`);
    }
  }

  if (failures.length > 0) {
    console.error("\n[summary] webhook provisioning finished with failures:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\n[summary] webhook provisioning completed successfully.");
}

async function runForAgent({
  agent,
  action,
  dryRun,
  webhookBaseUrl,
  webhookPathPrefix,
  dropPendingUpdates,
}) {
  const tokenInfo = resolveTokenForAgent(agent);
  if (!tokenInfo) {
    throw new Error(`No bot token found for '${agent}'. Expected one of: ${tokenKeyCandidates(agent).join(", ")}`);
  }

  if (action === "get") {
    if (dryRun) {
      console.log(`[dry-run] ${agent}: would call getWebhookInfo using ${tokenInfo.key}=${maskSecret(tokenInfo.value)}`);
      return;
    }

    const result = await callTelegram(tokenInfo.value, "getWebhookInfo");
    printWebhookInfo(agent, result);
    return;
  }

  if (action === "delete") {
    const payload = dropPendingUpdates ? { drop_pending_updates: true } : {};
    if (dryRun) {
      console.log(
        `[dry-run] ${agent}: would call deleteWebhook (drop_pending_updates=${Boolean(payload.drop_pending_updates)})`
      );
      return;
    }

    const result = await callTelegram(tokenInfo.value, "deleteWebhook", payload);
    console.log(`[ok] ${agent}: deleteWebhook=${Boolean(result.result)}`);
    return;
  }

  const secretInfo = resolveSecretForAgent(agent);
  if (!secretInfo || !secretInfo.value) {
    throw new Error(`Missing webhook secret for '${agent}'. Expected one of: ${secretKeyCandidates(agent).join(", ")}.`);
  }

  const webhookUrl = buildWebhookUrl(webhookBaseUrl, webhookPathPrefix, agent);
  const payload = {
    url: webhookUrl,
    secret_token: secretInfo.value,
    drop_pending_updates: dropPendingUpdates,
  };

  if (dryRun) {
    console.log(
      `[dry-run] ${agent}: would call setWebhook url=${webhookUrl} secret=${maskSecret(secretInfo.value)} token=${maskSecret(
        tokenInfo.value
      )}`
    );
    return;
  }

  const result = await callTelegram(tokenInfo.value, "setWebhook", payload);
  console.log(`[ok] ${agent}: setWebhook=${Boolean(result.result)} url=${webhookUrl}`);
}

function tokenKeyCandidates(agent) {
  const upper = agent.toUpperCase();
  return [`${upper}_BOT_TOKEN`, `TELEGRAM_${upper}_BOT_TOKEN`, `TELEGRAM_${upper}_GAING_BOT_TOKEN`];
}

function resolveTokenForAgent(agent) {
  return resolveFirstEnvValue(tokenKeyCandidates(agent));
}

function resolveSecretForAgent(agent) {
  return resolveFirstEnvValue(secretKeyCandidates(agent));
}

function secretKeyCandidates(agent) {
  const upper = agent.toUpperCase();
  return [`TELEGRAM_SECRET_${upper}`, `TELEGRAM_${upper}_WEBHOOK_SECRET`, `TELEGRAM_${upper}_SECRET`];
}

function resolveFirstEnvValue(keys) {
  for (const key of keys) {
    const raw = process.env[key];
    if (typeof raw === "string" && raw.trim().length > 0) {
      return { key, value: raw.trim() };
    }
  }
  return null;
}

function buildWebhookUrl(baseUrl, pathPrefix, agent) {
  const base = baseUrl.replace(/\/+$/, "");
  const pathPart = `${pathPrefix}/${agent}`;
  return `${base}${pathPart}`;
}

function normalizePathPrefix(prefix) {
  if (!prefix || typeof prefix !== "string") {
    return DEFAULT_WEBHOOK_PATH_PREFIX;
  }
  let value = prefix.trim();
  if (!value.startsWith("/")) {
    value = `/${value}`;
  }
  value = value.replace(/\/+$/, "");
  return value || DEFAULT_WEBHOOK_PATH_PREFIX;
}

function validateUrl(value, label) {
  if (!value) {
    throw new Error(`Missing ${label}.`);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw new Error(`Invalid URL for ${label}: ${value}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Unsupported protocol for ${label}: ${parsed.protocol}`);
  }
}

function callTelegram(token, method, payload = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);

    const req = https.request(
      {
        hostname: TELEGRAM_HOST,
        method: "POST",
        path: `/bot${token}/${method}`,
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (error) {
            reject(new Error(`Telegram returned non-JSON for ${method}: ${data.slice(0, 200)}`));
            return;
          }

          if (!parsed.ok) {
            const description = parsed.description || "Unknown Telegram API error";
            reject(new Error(`${method} failed: ${description}`));
            return;
          }

          resolve(parsed);
        });
      }
    );

    req.on("error", (error) => reject(new Error(`${method} request error: ${error.message}`)));
    req.write(body);
    req.end();
  });
}

function printWebhookInfo(agent, response) {
  const info = response.result || {};
  const lastErrorTime = info.last_error_date
    ? new Date(info.last_error_date * 1000).toISOString()
    : "none";

  console.log(`[ok] ${agent}:`);
  console.log(`  url=${info.url || "(not set)"}`);
  console.log(`  pending_update_count=${Number.isInteger(info.pending_update_count) ? info.pending_update_count : 0}`);
  console.log(`  has_custom_certificate=${Boolean(info.has_custom_certificate)}`);
  console.log(`  max_connections=${Number.isInteger(info.max_connections) ? info.max_connections : "n/a"}`);
  console.log(`  last_error_date=${lastErrorTime}`);
  if (info.last_error_message) {
    console.log(`  last_error_message=${info.last_error_message}`);
  }
}

function resolveAgents(args) {
  if (args.all) {
    return [...DEFAULT_AGENTS];
  }

  const inlineAgents = [];
  if (typeof args.agents === "string" && args.agents.trim().length > 0) {
    inlineAgents.push(...args.agents.split(",").map((agent) => agent.trim()).filter(Boolean));
  }

  if (Array.isArray(args.agent) && args.agent.length > 0) {
    inlineAgents.push(...args.agent);
  }

  if (inlineAgents.length === 0) {
    return [...DEFAULT_AGENTS];
  }

  return Array.from(new Set(inlineAgents.map((agent) => agent.toLowerCase())));
}

function parseArgs(argv) {
  const args = { agent: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    if (arg === "--all") {
      args.all = true;
      continue;
    }

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--drop-pending-updates") {
      args.dropPendingUpdates = true;
      continue;
    }

    const [key, inlineValue] = arg.split("=", 2);

    if (key === "--action") {
      args.action = inlineValue || argv[++i];
      continue;
    }

    if (key === "--agent") {
      const value = inlineValue || argv[++i];
      if (value) {
        args.agent.push(value.trim().toLowerCase());
      }
      continue;
    }

    if (key === "--agents") {
      args.agents = inlineValue || argv[++i];
      continue;
    }

    if (key === "--base-url") {
      args.baseUrl = inlineValue || argv[++i];
      continue;
    }

    if (key === "--path-prefix") {
      args.pathPrefix = inlineValue || argv[++i];
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function maskSecret(value) {
  if (!value || value.length < 8) {
    return "***";
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function loadEnvFromConventions() {
  const candidates = [
    path.join(__dirname, "..", ".env"),
    path.join(__dirname, "..", "..", "..", ".env"),
    path.join(process.cwd(), ".env"),
    path.join(process.env.HOME || "", ".omega_keys.env"),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }
    dotenv.config({ path: candidate });
  }
}

function printHelp() {
  console.log(`telegram-webhook-provision.js\n\nUsage:\n  node scripts/telegram-webhook-provision.js --action get --all\n  node scripts/telegram-webhook-provision.js --action set --agents codex,gemini --dry-run\n  node scripts/telegram-webhook-provision.js --action delete --agent codex --drop-pending-updates\n\nOptions:\n  --action <set|get|delete>        Telegram webhook operation (default: get)\n  --agent <name>                   Agent to operate on (repeatable)\n  --agents <a,b,c>                 Comma-separated agents\n  --all                            Use default GAING agent list\n  --base-url <url>                 Override TELEGRAM_WEBHOOK_BASE_URL for set\n  --path-prefix <path>             Override webhook path prefix (default: /telegram/webhook)\n  --drop-pending-updates           Pass drop_pending_updates=true for set/delete\n  --dry-run                        Print planned changes without API calls\n  --help                           Show this help\n\nEnv conventions used:\n  - Tokens: <AGENT>_BOT_TOKEN, TELEGRAM_<AGENT>_BOT_TOKEN, TELEGRAM_<AGENT>_GAING_BOT_TOKEN\n  - Webhook secret: TELEGRAM_SECRET_<AGENT> or TELEGRAM_<AGENT>_WEBHOOK_SECRET\n  - Webhook base: TELEGRAM_WEBHOOK_BASE_URL`);
}
