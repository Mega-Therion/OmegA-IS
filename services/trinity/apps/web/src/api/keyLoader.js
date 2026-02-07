import fs from "fs";

const KEY_FILE = "/home/mega/Documents/OMEGA-keys.txt";

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  const colon = trimmed.indexOf(":");
  let split = -1;
  if (eq !== -1) split = eq;
  else if (colon !== -1) split = colon;
  if (split === -1) return null;
  const key = trimmed.slice(0, split).trim();
  let value = trimmed.slice(split + 1).trim();
  if (!key) return null;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

export function loadOmegaKeys() {
  if (!fs.existsSync(KEY_FILE)) return;
  const content = fs.readFileSync(KEY_FILE, "utf-8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const kv = parseLine(line);
    if (!kv) continue;
    if (!process.env[kv.key]) {
      process.env[kv.key] = kv.value;
    }
  }
}
