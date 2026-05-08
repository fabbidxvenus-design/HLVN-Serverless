/**
 * Exponential backoff retry utility.
 * Used by the OCR proxy for transient provider errors (503, 429, timeouts).
 * Does NOT retry on auth errors (401, 403) or invalid request (400).
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Callback invoked before each retry. Useful for logging. */
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

/**
 * Default retry options.
 * Exponential backoff with jitter capped at 30 seconds.
 */
export const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, "onRetry">> & { onRetry: undefined } = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 30_000,
  onRetry: undefined,
};

/**
 * Determine if an error is retryable.
 * Retry: 429 (rate limit), 503 (service unavailable), network errors.
 * Don't retry: 400, 401, 403, 404, 5xx other than 503.
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof FetchError) {
    if (error.status === 429) return true;
    if (error.status === 503) return true;
    if (error.status === 0) return true; // network error / timeout
    return false;
  }
  if (error instanceof TypeError) return true; // network error
  return false;
}

export class FetchError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Add jitter to a base delay (0.5x–1.5x) to avoid thundering herd.
 */
function jitter(delayMs: number): number {
  return Math.floor(delayMs * (0.5 + Math.random()));
}

/**
 * Retry an async operation with exponential backoff.
 *
 * @param fn           The operation to retry.
 * @param options      Retry configuration.
 * @returns            The result of fn on success.
 * @throws             The last error after all attempts are exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === opts.maxAttempts) break;

      if (!isRetryable(err)) {
        // Non-retryable error — propagate immediately
        break;
      }

      // Exponential backoff: baseDelay * 2^(attempt-1) + jitter
      const rawDelay = opts.baseDelayMs * Math.pow(2, attempt - 1);
      const delayMs = Math.min(jitter(rawDelay), opts.maxDelayMs);

      opts.onRetry?.(attempt, delayMs, err);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Fetch with retry support.
 * Returns FetchError for non-2xx responses.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  return withRetry(async () => {
    const res = await fetch(url, init);
    if (!res.ok) {
      const body = await res.text().catch(() => undefined);
      throw new FetchError(res.status, `HTTP ${res.status}: ${res.statusText}`, body);
    }
    return res;
  }, options);
}