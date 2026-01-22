import { z } from "zod";

/**
 * Base environment schema shared by all backend applications.
 * Contains common infrastructure variables.
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgres://postgres:password@127.0.0.1:5432/qs_pro"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  LOG_FORMAT: z.enum(["json", "text"]).default("text"),
});

/**
 * API application environment schema.
 * Extends base schema with API-specific variables including session, encryption, and MCE OAuth.
 */
export const apiEnvSchema = baseEnvSchema
  .extend({
    PORT: z.coerce.number().default(3000),
    SESSION_SECRET: z
      .string()
      .min(32, "SESSION_SECRET must be at least 32 characters"),
    SESSION_SALT: z
      .string()
      .min(16, "SESSION_SALT must be at least 16 characters"),
    ENCRYPTION_KEY: z.string().min(32),
    MCE_CLIENT_ID: z.string().min(1),
    MCE_CLIENT_SECRET: z.string().min(1),
    MCE_REDIRECT_URI: z.string().url(),
    MCE_JWT_SIGNING_SECRET: z.string().min(1),
    MCE_JWT_ISSUER: z.string().optional(),
    MCE_JWT_AUDIENCE: z.string().optional(),
    COOKIE_SECURE: z
      .enum(["true", "false"])
      .default("true")
      .transform((v: "true" | "false") => v === "true"),
    COOKIE_SAMESITE: z.enum(["none", "lax", "strict"]).default("none"),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_PARTITIONED: z
      .enum(["true", "false"])
      .optional()
      .transform((v: "true" | "false" | undefined) => v === "true"),
  })
  .refine(
    (data: z.infer<ReturnType<typeof baseEnvSchema.extend>>) => {
      // Cross-field validation: SameSite=none requires Secure=true
      if (data.COOKIE_SAMESITE === "none" && !data.COOKIE_SECURE) {
        return false;
      }
      return true;
    },
    { message: "COOKIE_SAMESITE=none requires COOKIE_SECURE=true" },
  )
  .refine(
    (data: z.infer<ReturnType<typeof baseEnvSchema.extend>>) => {
      // Cross-field validation: Partitioned requires no domain (partitioned cookies must be host-only)
      if (data.COOKIE_PARTITIONED && data.COOKIE_DOMAIN) {
        return false;
      }
      return true;
    },
    {
      message:
        "COOKIE_PARTITIONED=true cannot be used with COOKIE_DOMAIN (partitioned cookies must be host-only)",
    },
  );

/**
 * Worker application environment schema.
 * Extends base schema with worker-specific variables.
 */
export const workerEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3001),
  ADMIN_API_KEY: z.string().min(1, "ADMIN_API_KEY is required"),
});

/**
 * Inferred TypeScript types from Zod schemas.
 * Use these for type-safe config access throughout the application.
 */
export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

/**
 * Validation functions for use with NestJS ConfigModule.
 * These are called during app bootstrap to validate environment variables.
 *
 * @example
 * ```typescript
 * ConfigModule.forRoot({
 *   validate: validateApiEnv,
 * })
 * ```
 */
export function validateApiEnv(env: Record<string, unknown>) {
  return apiEnvSchema.parse(env);
}

export function validateWorkerEnv(env: Record<string, unknown>) {
  return workerEnvSchema.parse(env);
}
