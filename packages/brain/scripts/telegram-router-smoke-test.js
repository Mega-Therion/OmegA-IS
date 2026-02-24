#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");
const dotenv = require("dotenv");

const DEFAULT_AGENTS = ["codex", "gemini", "claude", "grok", "perplexity", "deepseek", "kimi"];

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

  const agents = resolveAgents(args);
  const strict = Boolean(args.strict);
  const skipTelegramApi = Boolean(args.skipTelegramApi);

  const failures = [];
  const warnings = [];

  console.log(`[info] router smoke test starting for agents=${agents.join(",")} strict=${strict}`);

  const routerBaseUrl =
    args.routerBaseUrl ||
    process.env.TELEGRAM_ROUTER_BASE_URL ||
    process.env.GAING_BRAIN_URL ||
    process.env.OMEGA_BRAIN_BASE_URL ||
    "http://localhost:8080";

  try {
    validateUrl(routerBaseUrl, "router base URL");
  } catch (error) {
    failures.push(error.message);
  }

  const webhookBaseUrl = args.webhookBaseUrl || process.env.TELEGRAM_WEBHOOK_BASE_URL;
  const webhookPathPrefix = normalizePathPrefix(
    args.webhookPathPrefix || process.env.TELEGRAM_WEBHOOK_PATH_PREFIX || "/telegram/webhook"
  );

  if (!webhookBaseUrl) {
    warnings.push("Missing TELEGRAM_WEBHOOK_BASE_URL (webhook URL validation skipped).");
  } else {
    try {
      validateUrl(webhookBaseUrl, "webhook base URL");
    } catch (error) {
      failures.push(error.message);
    }
  }

  const agentConfigs = agents.map((agent) => buildAgentConfig(agent));

  for (const config of agentConfigs) {
    if (!config.tokenInfo) {
      failures.push(`${config.agent}: missing token env var (${tokenKeyCandidates(config.agent).join(" or ")})`);
    }

    if (!config.secretInfo) {
      failures.push(`${config.agent}: missing webhook secret (${secretKeyCandidates(config.agent).join(" or ")})`);
    }
  }

  const duplicateTokenGroups = findDuplicateTokens(agentConfigs);
  for (const group of duplicateTokenGroups) {
    failures.push(`Duplicate token detected across agents: ${group.join(", ")}`);
  }

  if (process.env.TELEGRAM_ALLOWED_USER_IDS) {
    const invalidUserIds = findInvalidCsvIds(process.env.TELEGRAM_ALLOWED_USER_IDS);
    if (invalidUserIds.length > 0) {
      failures.push(`TELEGRAM_ALLOWED_USER_IDS has invalid entries: ${invalidUserIds.join(", ")}`);
    }
  } else {
    warnings.push("TELEGRAM_ALLOWED_USER_IDS is not set.");
  }

  if (process.env.TELEGRAM_ALLOWED_CHAT_IDS) {
    const invalidChatIds = findInvalidCsvIds(process.env.TELEGRAM_ALLOWED_CHAT_IDS, true);
    if (invalidChatIds.length > 0) {
      failures.push(`TELEGRAM_ALLOWED_CHAT_IDS has invalid entries: ${invalidChatIds.join(", ")}`);
    }
  } else {
    warnings.push("TELEGRAM_ALLOWED_CHAT_IDS is not set.");
  }

  if (failures.length === 0) {
    const healthPath = args.healthPath || "/telegram/healthz";
    const health = await httpRequest("GET", new URL(healthPath, routerBaseUrl));
    if (health.status !== 200) {
      failures.push(`Health check failed: ${healthPath} returned HTTP ${health.status}`);
    } else {
      console.log(`[ok] health endpoint responded with HTTP 200 at ${healthPath}`);
    }
  }

  if (!skipTelegramApi) {
    for (const config of agentConfigs) {
      if (!config.tokenInfo) {
        continue;
      }

      try {
        const webhookInfo = await telegramRequest(config.tokenInfo.value, "getWebhookInfo");
        const currentUrl = webhookInfo.result && webhookInfo.result.url ? webhookInfo.result.url : "";

        if (webhookBaseUrl) {
          const expected = buildWebhookUrl(webhookBaseUrl, webhookPathPrefix, config.agent);
          if (currentUrl !== expected) {
            warnings.push(`${config.agent}: webhook URL mismatch (expected ${expected}, got ${currentUrl || "(not set)"})`);
          }
        }

        if (webhookInfo.result && Number(webhookInfo.result.pending_update_count) > 0) {
          warnings.push(`${config.agent}: pending_update_count=${webhookInfo.result.pending_update_count}`);
        }

        console.log(`[ok] ${config.agent}: getWebhookInfo succeeded`);
      } catch (error) {
        failures.push(`${config.agent}: getWebhookInfo failed (${error.message})`);
      }
    }
  }

  if (warnings.length > 0) {
    console.log("\n[warnings]");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (strict && warnings.length > 0) {
    failures.push("Strict mode enabled and warnings were found.");
  }

  if (failures.length > 0) {
    console.error("\n[summary] smoke test failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\n[summary] smoke test passed.");
}

function buildAgentConfig(agent) {
  return {
    agent,
    tokenInfo: resolveFirstEnvValue(tokenKeyCandidates(agent)),
    secretInfo: resolveFirstEnvValue(secretKeyCandidates(agent)),
  };
}

function tokenKeyCandidates(agent) {
  const upper = agent.toUpperCase();
  return [`${upper}_BOT_TOKEN`, `TELEGRAM_${upper}_BOT_TOKEN`, `TELEGRAM_${upper}_GAING_BOT_TOKEN`];
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
  return `${base}${pathPrefix}/${agent}`;
}

function validateUrl(value, label) {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`unsupported protocol '${parsed.protocol}'`);
    }
  } catch (error) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function normalizePathPrefix(prefix) {
  if (!prefix || typeof prefix !== "string") {
    return "/telegram/webhook";
  }

  let value = prefix.trim();
  if (!value.startsWith("/")) {
    value = `/${value}`;
  }
  value = value.replace(/\/+$/, "");
  return value || "/telegram/webhook";
}

function httpRequest(method, url) {
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        method,
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        headers: { accept: "application/json" },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode, body });
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

function telegramRequest(token, method, payload = {}) {
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.telegram.org",
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
            reject(new Error(`non-JSON response for ${method}`));
            return;
          }

          if (!parsed.ok) {
            reject(new Error(parsed.description || `Telegram API ${method} failed`));
            return;
          }

          resolve(parsed);
        });
      }
    );

    req.on("error", (error) => reject(new Error(error.message)));
    req.write(body);
    req.end();
  });
}

function findDuplicateTokens(configs) {
  const index = new Map();
  for (const config of configs) {
    if (!config.tokenInfo) {
      continue;
    }

    const key = config.tokenInfo.value;
    if (!index.has(key)) {
      index.set(key, []);
    }
    index.get(key).push(config.agent);
  }

  return Array.from(index.values()).filter((agents) => agents.length > 1);
}

function findInvalidCsvIds(value, allowNegative = false) {
  const invalid = [];
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);

  for (const part of parts) {
    const idPattern = allowNegative ? /^-?\d+$/ : /^\d+$/;
    if (!idPattern.test(part)) {
      invalid.push(part);
    }
  }

  return invalid;
}

function resolveAgents(args) {
  if (args.all) {
    return [...DEFAULT_AGENTS];
  }

  const values = [];
  if (typeof args.agents === "string") {
    values.push(...args.agents.split(",").map((item) => item.trim()).filter(Boolean));
  }

  if (Array.isArray(args.agent)) {
    values.push(...args.agent);
  }

  if (values.length === 0) {
    return [...DEFAULT_AGENTS];
  }

  return Array.from(new Set(values.map((value) => value.toLowerCase())));
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

    if (arg === "--strict") {
      args.strict = true;
      continue;
    }

    if (arg === "--skip-telegram-api") {
      args.skipTelegramApi = true;
      continue;
    }

    const [key, inlineValue] = arg.split("=", 2);

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

    if (key === "--router-base-url") {
      args.routerBaseUrl = inlineValue || argv[++i];
      continue;
    }

    if (key === "--webhook-base-url") {
      args.webhookBaseUrl = inlineValue || argv[++i];
      continue;
    }

    if (key === "--webhook-path-prefix") {
      args.webhookPathPrefix = inlineValue || argv[++i];
      continue;
    }

    if (key === "--health-path") {
      args.healthPath = inlineValue || argv[++i];
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
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
  console.log(`telegram-router-smoke-test.js\n\nUsage:\n  node scripts/telegram-router-smoke-test.js --all\n  node scripts/telegram-router-smoke-test.js --agents codex,gemini --strict\n\nChecks:\n  1) Router health endpoint (default: /telegram/healthz)\n  2) Basic env contract for tokens, webhook secrets, and allowed IDs\n  3) getWebhookInfo per selected agent (unless --skip-telegram-api)\n\nOptions:\n  --agent <name>                 Agent to test (repeatable)\n  --agents <a,b,c>               Comma-separated agents\n  --all                          Use default GAING agent list\n  --router-base-url <url>        Override TELEGRAM_ROUTER_BASE_URL/GAING_BRAIN_URL\n  --webhook-base-url <url>       Override TELEGRAM_WEBHOOK_BASE_URL\n  --webhook-path-prefix <path>   Override TELEGRAM_WEBHOOK_PATH_PREFIX\n  --health-path <path>           Health path (default: /telegram/healthz)\n  --skip-telegram-api            Skip getWebhookInfo checks\n  --strict                       Treat warnings as failures\n  --help                         Show this help`);
}
