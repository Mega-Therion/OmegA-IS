import { hudEnvSchema } from "./env.schema";

type EnvCheck = {
  ok: boolean;
  missing: string[];
};

const parsedEnv = hudEnvSchema.safeParse({
  NEXT_PUBLIC_BRAIN_API_URL: process.env.NEXT_PUBLIC_BRAIN_API_URL,
  NEXT_PUBLIC_BRIDGE_API_URL: process.env.NEXT_PUBLIC_BRIDGE_API_URL,
  GAING_BRAIN_URL: process.env.GAING_BRAIN_URL,
  GAING_BRAIN_TIMEOUT_MS: process.env.GAING_BRAIN_TIMEOUT_MS,
});

const parsedData = parsedEnv.success ? parsedEnv.data : {};

const BRAIN_API_URL =
  parsedData.NEXT_PUBLIC_BRAIN_API_URL || "http://localhost:8080";
const BRIDGE_API_URL =
  parsedData.NEXT_PUBLIC_BRIDGE_API_URL || "http://localhost:8000";

const invalid = parsedEnv.success
  ? []
  : parsedEnv.error.issues.map(
      issue => `${issue.path.join(".")}: ${issue.message}`
    );

export function validateEnv(): EnvCheck {
  const missing: string[] = [];

  if (!process.env.NEXT_PUBLIC_BRAIN_API_URL) {
    missing.push("NEXT_PUBLIC_BRAIN_API_URL");
  }

  if (!process.env.NEXT_PUBLIC_BRIDGE_API_URL) {
    missing.push("NEXT_PUBLIC_BRIDGE_API_URL");
  }

  if (invalid.length) {
    console.warn(
      `[hud] Invalid env vars: ${invalid.join("; ")}. ` +
        `Using defaults: BRAIN_API_URL=${BRAIN_API_URL}, BRIDGE_API_URL=${BRIDGE_API_URL}.`
    );
  }

  if (missing.length) {
    // Keep as warning to avoid breaking dev.
    console.warn(
      `[hud] Missing env vars: ${missing.join(", ")}. Using defaults: ` +
        `BRAIN_API_URL=${BRAIN_API_URL}, BRIDGE_API_URL=${BRIDGE_API_URL}.`
    );
  }

  return { ok: missing.length === 0, missing };
}

export const env = {
  BRAIN_API_URL,
  BRIDGE_API_URL,
};
