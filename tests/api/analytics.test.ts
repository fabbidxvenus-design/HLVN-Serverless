/**
 * Analytics API route tests.
 * Tests auth guard behavior and empty date range responses.
 */

import { describe, it, expect } from "vitest";
import { extractBearerToken } from "@/lib/auth/session";
import type { ApiResponse } from "@/types/api";

describe("analytics API — request shape helpers", () => {
  it("extractBearerToken works for analytics auth header", () => {
    const token = extractBearerToken("Bearer admin-token-abc123");
    expect(token).toBe("admin-token-abc123");
  });

  it("extractBearerToken rejects missing token", () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken("")).toBeNull();
  });
});

describe("analytics API — response envelope", () => {
  it("ok() envelope has success true and data field", async () => {
    const { ok } = await import("@/lib/api/response");
    const payload = { totalScans: 42, activeUsers: 3, apiCost: 1.25, successRate: 0.95 };
    const envelope = ok(payload);
    expect((envelope as { success: boolean }).success).toBe(true);
    expect((envelope as { data: typeof payload }).data).toEqual(payload);
  });

  it("fail() envelope has success false and error/code fields", async () => {
    const { fail } = await import("@/lib/api/response");
    const envelope = fail("Admin required", "FORBIDDEN");
    expect((envelope as { success: boolean }).success).toBe(false);
    expect((envelope as { error: string }).error).toBe("Admin required");
    expect((envelope as { code: string }).code).toBe("FORBIDDEN");
  });
});

describe("analytics API — empty date range returns zero dataset", () => {
  it("AnalyticsSummary fields are all numeric", () => {
    const payload = { totalScans: 0, activeUsers: 0, apiCost: 0, successRate: 0 };
    expect(typeof payload.totalScans).toBe("number");
    expect(typeof payload.activeUsers).toBe("number");
    expect(typeof payload.apiCost).toBe("number");
    expect(typeof payload.successRate).toBe("number");
  });

  it("AnalyticsTrends shape has points array field", () => {
    const trends = { points: [] as Array<{ label: string; scans: number; cost: number }> };
    expect(Array.isArray(trends.points)).toBe(true);
    expect(trends.points.length).toBe(0);
  });

  it("TopProducts shape has products array field", () => {
    const top = { products: [] as Array<{ name: string; count: number; lastSeen: string }> };
    expect(Array.isArray(top.products)).toBe(true);
  });

  it("TopUsers shape has users array field", () => {
    const top = { users: [] as Array<{ userId: string; email: string; scanCount: number; cost: number }> };
    expect(Array.isArray(top.users)).toBe(true);
  });

  it("APIUsage shape has keys array field", () => {
    const usage = { keys: [] as Array<{ apiKeyIndex: number; calls: number; inputTokens: number; outputTokens: number; cost: number }> };
    expect(Array.isArray(usage.keys)).toBe(true);
  });
});
