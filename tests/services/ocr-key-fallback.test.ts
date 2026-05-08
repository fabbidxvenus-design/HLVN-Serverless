import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { loadApiKeys, withKeyFallback, KeyError } from "@/lib/ocr/key-fallback";

// Mock process.env for these tests
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe("loadApiKeys", () => {
  it("returns empty array when no keys configured", () => {
    delete process.env.OPENROUTER_KEY_1;
    const keys = loadApiKeys();
    expect(keys).toEqual([]);
  });

  it("loads KEY_1 when present", () => {
    process.env.OPENROUTER_KEY_1 = "sk-test-key-1";
    const keys = loadApiKeys();
    expect(keys).toHaveLength(1);
    expect(keys[0]!.index).toBe(0);
    expect(keys[0]!.key).toBe("sk-test-key-1");
  });

  it("loads multiple keys in order", () => {
    process.env.OPENROUTER_KEY_1 = "sk-key-1";
    process.env.OPENROUTER_KEY_2 = "sk-key-2";
    process.env.OPENROUTER_KEY_3 = "sk-key-3";
    const keys = loadApiKeys();
    expect(keys).toHaveLength(3);
    expect(keys[0]!.key).toBe("sk-key-1");
    expect(keys[1]!.key).toBe("sk-key-2");
    expect(keys[2]!.key).toBe("sk-key-3");
  });

  it("skips empty string keys", () => {
    process.env.OPENROUTER_KEY_1 = "sk-key-1";
    process.env.OPENROUTER_KEY_2 = "";
    const keys = loadApiKeys();
    expect(keys).toHaveLength(1);
    expect(keys[0]!.key).toBe("sk-key-1");
  });

  it("stops at first missing key", () => {
    process.env.OPENROUTER_KEY_1 = "sk-key-1";
    process.env.OPENROUTER_KEY_2 = "sk-key-2";
    delete process.env.OPENROUTER_KEY_3;
    const keys = loadApiKeys();
    expect(keys).toHaveLength(2);
  });
});

describe("withKeyFallback", () => {
  it("returns first successful result", async () => {
    const fn = vi.fn().mockResolvedValue({ apiKeyIndex: 0, result: "success" });
    const keys = [{ index: 0, key: "key-1" }, { index: 1, key: "key-2" }];
    const result = await withKeyFallback(keys, fn);
    expect(result.result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("falls back to second key on first failure", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("quota"))
      .mockResolvedValueOnce({ apiKeyIndex: 1, result: "fallback success" });
    const keys = [{ index: 0, key: "key-1" }, { index: 1, key: "key-2" }];
    const result = await withKeyFallback(keys, fn);
    expect(result.result).toBe("fallback success");
    expect(result.apiKeyIndex).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws KeyError when all keys exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("all failed"));
    const keys = [{ index: 0, key: "key-1" }];
    await expect(withKeyFallback(keys, fn)).rejects.toThrow(KeyError);
  });

  it("throws immediately on non-retryable error (auth)", async () => {
    const authError = { status: 401, message: "bad key" };
    const fn = vi.fn().mockRejectedValue(authError);
    const keys = [{ index: 0, key: "key-1" }, { index: 1, key: "key-2" }];
    await expect(withKeyFallback(keys, fn)).rejects.toThrow(KeyError);
    expect(fn).toHaveBeenCalledTimes(1); // no fallback attempted
  });

  it("calls onKeyError callback for each failure", async () => {
    const onKeyError = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("quota"))
      .mockResolvedValueOnce({ apiKeyIndex: 1, result: "ok" });
    const keys = [{ index: 0, key: "k0" }, { index: 1, key: "k1" }];
    await withKeyFallback(keys, fn, onKeyError);
    expect(onKeyError).toHaveBeenCalledTimes(1);
    expect(onKeyError).toHaveBeenCalledWith(0, expect.any(Error), true);
  });
});

describe("KeyError", () => {
  it("carries apiKeyIndex and retryable flag", () => {
    const err = new KeyError(2, "quota exceeded", true);
    expect(err.apiKeyIndex).toBe(2);
    expect(err.retryable).toBe(true);
    expect(err.message).toBe("quota exceeded");
  });

  it("retryable=false for auth errors", () => {
    const err = new KeyError(0, "invalid key", false);
    expect(err.retryable).toBe(false);
  });
});