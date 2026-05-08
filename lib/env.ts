/**
 * Environment variable validation — fails fast at startup.
 * Import this at the top of any module that reads env vars at runtime.
 */

export interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENROUTER_KEY_1: string;
  CORS_ORIGINS: string;
}

const REQUIRED: (keyof EnvConfig)[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENROUTER_KEY_1",
  "CORS_ORIGINS",
];

/**
 * Validate all required environment variables.
 * Throws with a clear list of missing variables — does not continue silently.
 */
export function validateEnv(): EnvConfig {
  const missing: string[] = [];
  const values: EnvConfig = {} as EnvConfig;

  for (const key of REQUIRED) {
    const val = process.env[key];
    if (!val) {
      missing.push(key);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (values as any)[key] = val;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables:\n  ${missing.join(", ")}\n` +
      `Set these in .env.local or your deployment environment.`,
    );
  }

  return values;
}

/**
 * Get a single env var, throwing if it is not set.
 * Use for runtime access to required vars after validateEnv() has already run.
 */
export function requireEnv(key: keyof EnvConfig): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`[env] Required variable ${key} is not set — call validateEnv() first`);
  }
  return val;
}
