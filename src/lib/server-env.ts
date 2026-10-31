import "server-only";
import { z } from "zod";

/**
 * Optional server-only tuning. Nothing here is required, and no secrets are
 * read in Phase 1. Server-only values must never be imported from client code.
 */
const serverEnvSchema = z.object({
  /** Max sign-in/sign-up attempts per IP per minute. Defaults to 10. */
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100_000).optional(),
});

export const serverEnv = serverEnvSchema.parse({
  AUTH_RATE_LIMIT_MAX: process.env.AUTH_RATE_LIMIT_MAX || undefined,
});
