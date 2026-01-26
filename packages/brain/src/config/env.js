require("dotenv").config();

const { validateEnvSchema } = require("./env.schema");

const envSchemaResult = validateEnvSchema(process.env);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN;
const ENABLE_NGROK = process.env.ENABLE_NGROK === "1";
const GAING_SHARED_TOKEN = process.env.GAING_SHARED_TOKEN;
const MEM0_API_KEY = process.env.MEM0_API_KEY;
const GROK_API_KEY = process.env.GROK_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const LLM_PROVIDER = process.env.LLM_PROVIDER || null;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OMEGA_EMBED_MODEL = process.env.OMEGA_EMBED_MODEL;
const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL;
const OPENAI_TTS_VOICE = process.env.OPENAI_TTS_VOICE;
const OPENAI_ASR_MODEL = process.env.OPENAI_ASR_MODEL || "whisper-1";
const OPENAI_AUDIO_TIMEOUT_MS = parseInt(
  process.env.OPENAI_AUDIO_TIMEOUT_MS || "20000",
  10
);
const OPENAI_FALLBACK_BASE_URL = process.env.OPENAI_FALLBACK_BASE_URL;
const OPENAI_FALLBACK_API_KEY = process.env.OPENAI_FALLBACK_API_KEY;
const LOCAL_ASR_FALLBACK_COMMAND = process.env.LOCAL_ASR_FALLBACK_COMMAND;
const LOCAL_ASR_FALLBACK_TIMEOUT_MS = parseInt(
  process.env.LOCAL_ASR_FALLBACK_TIMEOUT_MS || "40000",
  10
);
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID;
const TTS_PROVIDER = process.env.TTS_PROVIDER;
const OMEGA_PERSONA_PATH = process.env.OMEGA_PERSONA_PATH;
const OMEGA_PERSONA_ENABLED = process.env.OMEGA_PERSONA_ENABLED;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT;
const AZURE_OPENAI_API_VERSION =
  process.env.AZURE_OPENAI_API_VERSION || "2024-06-01";
const DISABLE_AUTH = process.env.DISABLE_AUTH === "1";
const PORT =
  envSchemaResult.success && envSchemaResult.data.PORT
    ? envSchemaResult.data.PORT
    : process.env.PORT || 8080;

// OMEGA Trinity Configuration
const BRIDGE_URL =
  envSchemaResult.success && envSchemaResult.data.BRIDGE_URL
    ? envSchemaResult.data.BRIDGE_URL
    : process.env.BRIDGE_URL || "http://localhost:8000";
const HUD_URL =
  envSchemaResult.success && envSchemaResult.data.HUD_URL
    ? envSchemaResult.data.HUD_URL
    : process.env.HUD_URL || "http://localhost:3000";
const REDIS_URL = process.env.REDIS_URL;
const MILVUS_URL = process.env.MILVUS_URL;
const NEO4J_URL = process.env.NEO4J_URL;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

function formatZodIssues(issues) {
  return issues
    .map(issue => {
      const path = issue.path.length ? issue.path.join(".") : "env";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function validateEnv({ strict = process.env.OMEGA_STRICT_ENV === "1" } = {}) {
  const missing = [];
  const requireSupabase =
    process.env.NODE_ENV === "production" && !DISABLE_AUTH;

  if (!envSchemaResult.success) {
    const message = `[brain] Invalid env vars: ${formatZodIssues(envSchemaResult.error.issues)}`;
    if (strict) {
      throw new Error(message);
    }
    console.warn(message);
  }

  if (requireSupabase && !SUPABASE_URL) {
    missing.push("SUPABASE_URL");
  }

  if (requireSupabase && !supabaseKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY");
  }

  if (missing.length) {
    const message = `[brain] Missing env vars: ${missing.join(", ")}`;
    if (strict) {
      throw new Error(message);
    }
    console.warn(message);
  }

  return { ok: missing.length === 0, missing };
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  NGROK_AUTHTOKEN,
  ENABLE_NGROK,
  GAING_SHARED_TOKEN,
  MEM0_API_KEY,
  GROK_API_KEY,
  PERPLEXITY_API_KEY,
  GEMINI_API_KEY,
  LLM_PROVIDER,
  OPENAI_API_KEY,
  OPENAI_BASE_URL,
  OPENAI_MODEL,
  OMEGA_EMBED_MODEL,
  OPENAI_TTS_MODEL,
  OPENAI_TTS_VOICE,
  OPENAI_ASR_MODEL,
  OPENAI_AUDIO_TIMEOUT_MS,
  OPENAI_FALLBACK_BASE_URL,
  OPENAI_FALLBACK_API_KEY,
  LOCAL_ASR_FALLBACK_COMMAND,
  LOCAL_ASR_FALLBACK_TIMEOUT_MS,
  ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID,
  ELEVENLABS_MODEL_ID,
  TTS_PROVIDER,
  OMEGA_PERSONA_PATH,
  OMEGA_PERSONA_ENABLED,
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_DEPLOYMENT,
  AZURE_OPENAI_API_VERSION,
  DISABLE_AUTH,
  PORT,
  BRIDGE_URL,
  HUD_URL,
  REDIS_URL,
  MILVUS_URL,
  NEO4J_URL,
  NEO4J_USER,
  NEO4J_PASSWORD,
  supabaseKey,
  validateEnv,
};
