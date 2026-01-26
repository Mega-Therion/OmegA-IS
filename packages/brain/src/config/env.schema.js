const { z } = require("zod");

const urlSchema = z.string().url();

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SUPABASE_URL: urlSchema.optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  BRIDGE_URL: urlSchema.optional(),
  HUD_URL: urlSchema.optional(),
  REDIS_URL: z.string().min(1).optional(),
  MILVUS_URL: z.string().min(1).optional(),
  NEO4J_URL: z.string().min(1).optional(),
  NEO4J_USER: z.string().min(1).optional(),
  NEO4J_PASSWORD: z.string().min(1).optional(),
});

function validateEnvSchema(rawEnv) {
  return envSchema.safeParse(rawEnv);
}

module.exports = { envSchema, validateEnvSchema };
