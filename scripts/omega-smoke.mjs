#!/usr/bin/env node
/**
 * Omega smoke test
 * - Checks gateway health/status
 * - Tests idempotent memory upsert and replay
 */

import crypto from "node:crypto";
const base = process.env.OMEGA_GATEWAY_URL || `http://localhost:${process.env.GATEWAY_PORT || 8787}/api/v1`;
const bearer = process.env.OMEGA_API_BEARER_TOKEN || "";

async function request(path, opts = {}) {
  const url = `${base}${path}`;
  const headers = {
    "content-type": "application/json",
    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

async function run() {
  console.log(`[smoke] Gateway base: ${base}`);

  const health = await request("/health");
  if (health.status !== 200 || !health.json.ok) {
    throw new Error(`Health failed: ${health.status} ${JSON.stringify(health.json)}`);
  }
  console.log("[smoke] Health OK");

  const status = await request("/status");
  console.log("[smoke] Status:", status.json);

  const idemKey = crypto.randomUUID();
  const body = {
    namespace: "smoke",
    content: "smoke-test",
    meta: { test: "omega-smoke" },
  };

  const up1 = await request("/memory/upsert", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "X-Idempotency-Key": idemKey },
  });
  if (up1.status !== 200) {
    throw new Error(`Upsert failed: ${up1.status} ${JSON.stringify(up1.json)}`);
  }
  console.log("[smoke] Upsert OK", up1.json);

  const up2 = await request("/memory/upsert", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "X-Idempotency-Key": idemKey },
  });
  if (up2.status !== 200) {
    throw new Error(`Idempotent replay failed: ${up2.status} ${JSON.stringify(up2.json)}`);
  }
  console.log("[smoke] Idempotent replay OK", up2.json);

  console.log("[smoke] All good.");
}

run().catch(err => {
  console.error("[smoke] FAIL:", err);
  process.exit(1);
});
