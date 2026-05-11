/**
 * Multi-key fallback for Gemini API calls.
 * Tries keys in order (KEY_1, KEY_2, …); falls back on auth failures and quota errors.
 */

import type { RetryOptions } from "@/lib/ocr/retry";
import { FetchError } from "@/lib/ocr/retry";

/** A single Gemini API key with its index. */
export interface ApiKey {
  index: number;
  key: string;
}

/** An error that carries the apiKeyIndex that caused it. */
export class KeyError extends Error {
  constructor(
    public readonly apiKeyIndex: number,
    message: string,
    public readonly retryable: boolean, // true = quota/503, false = auth/invalid
  ) {
    super(message);
    this.name = "KeyError";
  }
}

/**
 * Load all GEMINI_KEY_N environment variables, sorted by index.
 * Returns an empty array if none are configured.
 */
export function loadApiKeys(): ApiKey[] {
  const keys: ApiKey[] = [];
  let i = 1;
  while (true) {
    const envKey = `GEMINI_KEY_${i}`;
    const value = process.env[envKey];
    if (value === undefined) break;
    if (value.length > 0) {
      keys.push({ index: i - 1, key: value });
    }
    i++;
  }
  return keys;
}

/**
 * Call an async operation with sequential key fallback.
 *
 * @param keys            Ordered list of API keys.
 * @param fn              Async function to call with the current key's index.
 *                        Return { apiKeyIndex, result } on success.
 * @param onKeyError      Callback when a key fails (for logging/metrics).
 * @returns               The successful result with apiKeyIndex.
 * @throws KeyError       When all keys are exhausted.
 */
export async function withKeyFallback<T>(
  keys: ApiKey[],
  fn: (key: ApiKey) => Promise<{ apiKeyIndex: number; result: T }>,
  onKeyError?: (keyIndex: number, err: unknown, retryable: boolean) => void,
): Promise<{ apiKeyIndex: number; result: T }> {
  if (keys.length === 0) {
    throw new KeyError(-1, "No Gemini API keys configured", false);
  }

  let lastError: KeyError | undefined;

  for (const key of keys) {
    try {
      return await fn(key);
    } catch (err) {
      const retryable = isKeyRetryable(err);
      onKeyError?.(key.index, err, retryable);

      if (!retryable) {
        // Non-retryable (auth/invalid) — re-throw immediately
        if (err instanceof KeyError) throw err;
        throw new KeyError(key.index, getErrorMessage(err), false);
      }

      lastError = err instanceof KeyError ? err : new KeyError(key.index, getErrorMessage(err), true);
    }
  }

  // All keys exhausted
  throw lastError ?? new KeyError(-1, "All API keys failed", true);
}

/**
 * Determine if an error for a specific key should trigger fallback.
 * Retryable: 401 (key revoked), 403, 429 (quota), 503 (provider issue).
 * Not retryable: 400 (bad request format), 402 (payment required).
 */
function isKeyRetryable(err: unknown): boolean {
  if (err instanceof FetchError) {
    if (err.status === 401) return true;  // key revoked or rotated
    if (err.status === 403) return true;  // permissions changed
    if (err.status === 429) return true;  // rate limit
    if (err.status === 503) return true;  // provider overloaded
    if (err.status === 0) return true;    // network error
    return false;
  }
  if (err instanceof TypeError) return true; // network
  // Treat plain Errors as retryable unless they're clearly auth/invalid
  // (e.g., "quota exceeded", "timeout", "rate limit", "unavailable")
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("timeout") ||
      msg.includes("unavailable") ||
      msg.includes("network") ||
      msg.includes("fetch") ||
      msg.includes("connection")
    ) {
      return true;
    }
    return false; // unknown error — treat as non-retryable to avoid infinite loops
  }
  return false;
}

/**
 * Extract error message from unknown error, preserving FetchError body if present.
 */
function getErrorMessage(err: unknown): string {
  if (err instanceof FetchError) {
    const base = `FetchError: ${err.message}`;
    if (err.body) {
      return `${base}\nResponse body: ${err.body}`;
    }
    return base;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}