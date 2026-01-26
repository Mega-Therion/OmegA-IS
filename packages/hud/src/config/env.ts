type EnvCheck = {
  ok: boolean;
  missing: string[];
};

const BRAIN_API_URL = process.env.NEXT_PUBLIC_BRAIN_API_URL || 'http://localhost:8080';
const BRIDGE_API_URL = process.env.NEXT_PUBLIC_BRIDGE_API_URL || 'http://localhost:8000';

export function validateEnv(): EnvCheck {
  const missing: string[] = [];

  if (!process.env.NEXT_PUBLIC_BRAIN_API_URL) {
    missing.push('NEXT_PUBLIC_BRAIN_API_URL');
  }

  if (!process.env.NEXT_PUBLIC_BRIDGE_API_URL) {
    missing.push('NEXT_PUBLIC_BRIDGE_API_URL');
  }

  if (missing.length) {
    // Keep as warning to avoid breaking dev.
    console.warn(
      `[hud] Missing env vars: ${missing.join(', ')}. Using defaults: ` +
        `BRAIN_API_URL=${BRAIN_API_URL}, BRIDGE_API_URL=${BRIDGE_API_URL}.`
    );
  }

  return { ok: missing.length === 0, missing };
}

export const env = {
  BRAIN_API_URL,
  BRIDGE_API_URL,
};
