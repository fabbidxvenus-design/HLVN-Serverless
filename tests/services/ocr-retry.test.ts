import { describe, it, expect, vi, beforeEach } from "vitest";
import { withRetry, isRetryable, FetchError, DEFAULT_RETRY_OPTIONS } from "@/lib/ocr/retry";

describe("isRetryable", () => {
  it("not retryable: 429 rate limit (handled by key fallback)", () => {
    expect(isRetryable(new FetchError(429, "Rate limited"))).toBe(false);
  });

  it("retryable: 503 unavailable", () => {
    expect(isRetryable(new FetchError(503, "Service unavailable"))).toBe(true);
  });

  it("retryable: network error (status 0)", () => {
    expect(isRetryable(new FetchError(0, "Network error"))).toBe(true);
  });

  it("retryable: TypeError (network)", () => {
    expect(isRetryable(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("not retryable: 400 bad request", () => {
    expect(isRetryable(new FetchError(400, "Bad request"))).toBe(false);
  });

  it("not retryable: 401 unauthorized", () => {
    expect(isRetryable(new FetchError(401, "Unauthorized"))).toBe(false);
  });

  it("not retryable: 403 forbidden", () => {
    expect(isRetryable(new FetchError(403, "Forbidden"))).toBe(false);
  });

  it("not retryable: 404 not found", () => {
    expect(isRetryable(new FetchError(404, "Not found"))).toBe(false);
  });

  it("retryable: 500 internal error", () => {
    expect(isRetryable(new FetchError(500, "Internal error"))).toBe(true);
  });
});

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable error up to maxAttempts", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new FetchError(503, "unavailable"))
      .mockRejectedValueOnce(new FetchError(503, "unavailable"))
      .mockResolvedValueOnce("ok");

    const result = await withRetry(fn, { maxAttempts: 3 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws immediately on non-retryable error", async () => {
    const fn = vi.fn().mockRejectedValue(new FetchError(401, "bad key"));
    await expect(withRetry(fn)).rejects.toThrow(FetchError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting all attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new FetchError(503, "unavailable"));
    await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toThrow(FetchError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("calls onRetry callback before each retry", async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new FetchError(503, "unavailable"))
      .mockResolvedValueOnce("ok");

    await withRetry(fn, { onRetry });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Number), expect.any(Error));
  });

  it("applies exponential backoff delay", async () => {
    const start = Date.now();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new FetchError(503, "unavailable"))
      .mockResolvedValueOnce("ok");

    await withRetry(fn, { baseDelayMs: 100 });
    const elapsed = Date.now() - start;
    // With jitter (0.5-1.5x), delay should be between 50-150ms
    expect(elapsed).toBeGreaterThanOrEqual(50);
  });

  it("caps delay at maxDelayMs", async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new FetchError(503, "unavailable"))
      .mockResolvedValueOnce("ok");

    await withRetry(fn, { baseDelayMs: 1000, maxDelayMs: 50, onRetry });
    // With 1s base and 0.5-1.5x jitter, max would be 1500ms, but cap is 50ms
    const calls = onRetry.mock.calls as unknown as Array<[number, number, unknown]>;
    const [, delayMs] = calls[0]!;
    expect(delayMs).toBeLessThanOrEqual(50);
  });
});

describe("DEFAULT_RETRY_OPTIONS", () => {
  it("has reduced defaults for user-facing OCR latency", () => {
    expect(DEFAULT_RETRY_OPTIONS.maxAttempts).toBe(2);
    expect(DEFAULT_RETRY_OPTIONS.baseDelayMs).toBe(300);
    expect(DEFAULT_RETRY_OPTIONS.maxDelayMs).toBe(2_000);
  });
});