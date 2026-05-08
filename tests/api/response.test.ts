import { describe, it, expect } from "vitest";
import { ok, fail } from "@/lib/api/response";
import type { ApiMeta } from "@/types/api";

describe("ok()", () => {
  it("returns a success envelope with data", () => {
    const result = ok({ id: "123", name: "test" });
    expect(result).toEqual({ success: true, data: { id: "123", name: "test" } });
  });

  it("includes meta when provided", () => {
    const meta: ApiMeta = { page: 1, limit: 20, total: 100, hasMore: true };
    const result = ok({ items: [] }, meta);
    expect(result).toEqual({ success: true, data: { items: [] }, meta });
  });

  it("does not include meta key when omitted", () => {
    const result = ok("hello");
    expect("meta" in result).toBe(false);
  });
});

describe("fail()", () => {
  it("returns a failure envelope with code and message", () => {
    const result = fail("Invalid email", "VALIDATION_ERROR");
    expect(result).toEqual({ success: false, error: "Invalid email", code: "VALIDATION_ERROR" });
  });

  it("includes meta when provided", () => {
    const meta = { page: 1 };
    const result = fail("Not found", "NOT_FOUND", meta);
    expect(result).toEqual({ success: false, error: "Not found", code: "NOT_FOUND", meta: { page: 1 } });
  });

  it("maps all known error codes", () => {
    const codes = [
      "AUTH_FAILED",
      "FORBIDDEN",
      "VALIDATION_ERROR",
      "NOT_FOUND",
      "QUOTA_EXCEEDED",
      "PROVIDER_ERROR",
      "RATE_LIMITED",
      "INTERNAL_ERROR",
    ] as const;
    codes.forEach((code) => {
      const result = fail("test error", code);
      // Cast to the error branch of ApiResponse<never> to access .code.
      expect((result as { success: false; code: string }).code).toBe(code);
    });
  });
});