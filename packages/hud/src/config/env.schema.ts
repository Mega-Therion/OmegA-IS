import { z } from "zod";

export const hudEnvSchema = z.object({
  NEXT_PUBLIC_BRAIN_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_BRIDGE_API_URL: z.string().url().optional(),
  GAING_BRAIN_URL: z.string().url().optional(),
  GAING_BRAIN_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
});
