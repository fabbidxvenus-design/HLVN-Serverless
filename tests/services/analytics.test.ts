import { describe, it, expect, vi } from "vitest";
import {
  getAnalyticsSummary,
  getAnalyticsTrends,
  getAnalyticsTopProducts,
  getAnalyticsTopUsers,
  getAnalyticsApiUsage,
} from "@/lib/analytics/service";
import * as repository from "@/lib/analytics/repository";

// ── Mock repository entirely so we don't need a real Supabase client ──────────
vi.mock("@/lib/analytics/repository", () => ({
  getSummaryMetrics: vi.fn(),
  getTrendData: vi.fn(),
  getTopProducts: vi.fn(),
  getTopUsers: vi.fn(),
  getApiUsage: vi.fn(),
}));

const { getSummaryMetrics, getTrendData, getTopProducts, getTopUsers, getApiUsage } = vi.mocked(repository);

describe("getAnalyticsSummary", () => {
  it("returns summary metrics from repository", async () => {
    getSummaryMetrics.mockResolvedValueOnce({
      totalScans: 42,
      activeUsers: 3,
      apiCost: 0.85,
      successRate: 0.95,
    });

    const result = await getAnalyticsSummary({});
    expect(result.totalScans).toBe(42);
    expect(result.activeUsers).toBe(3);
    expect(result.apiCost).toBe(0.85);
    expect(result.successRate).toBe(0.95);
  });

  it("passes date range to repository", async () => {
    getSummaryMetrics.mockResolvedValueOnce({
      totalScans: 0, activeUsers: 0, apiCost: 0, successRate: 0,
    });

    await getAnalyticsSummary({ from: "2026-01-01", to: "2026-01-31" });
    expect(getSummaryMetrics).toHaveBeenCalledWith({ from: "2026-01-01", to: "2026-01-31" });
  });

  it("returns zero metrics for empty dataset", async () => {
    getSummaryMetrics.mockResolvedValueOnce({
      totalScans: 0, activeUsers: 0, apiCost: 0, successRate: 0,
    });

    const result = await getAnalyticsSummary({});
    expect(result.totalScans).toBe(0);
    expect(result.activeUsers).toBe(0);
    expect(result.apiCost).toBe(0);
    expect(result.successRate).toBe(0);
  });
});

describe("getAnalyticsTrends", () => {
  it("returns trend points array", async () => {
    getTrendData.mockResolvedValueOnce([
      { label: "2026-01-01", scans: 5, cost: 0.1 },
      { label: "2026-01-02", scans: 8, cost: 0.15 },
    ]);

    const result = await getAnalyticsTrends({});
    expect(result.points).toHaveLength(2);
    expect(result.points[0]!.label).toBe("2026-01-01");
  });

  it("normalizes invalid bucket to 'day'", async () => {
    getTrendData.mockResolvedValueOnce([]);

    await getAnalyticsTrends({}, "invalid");
    expect(getTrendData).toHaveBeenCalledWith({}, "day");
  });

  it("accepts valid bucket values", async () => {
    getTrendData.mockResolvedValueOnce([]);

    await getAnalyticsTrends({}, "week");
    expect(getTrendData).toHaveBeenCalledWith({}, "week");

    await getAnalyticsTrends({}, "month");
    expect(getTrendData).toHaveBeenCalledWith({}, "month");
  });
});

describe("getAnalyticsTopProducts", () => {
  it("returns products array", async () => {
    getTopProducts.mockResolvedValueOnce([
      { name: "Nike Dri-FIT", count: 15, lastSeen: "2026-01-15T10:00:00Z" },
      { name: "Adidas Ultraboost", count: 8, lastSeen: "2026-01-14T09:00:00Z" },
    ]);

    const result = await getAnalyticsTopProducts({});
    expect(result.products).toHaveLength(2);
    expect(result.products[0]!.name).toBe("Nike Dri-FIT");
  });

  it("clamps limit between 1 and 100", async () => {
    getTopProducts.mockResolvedValueOnce([]);

    await getAnalyticsTopProducts({}, 0);
    expect(getTopProducts).toHaveBeenCalledWith({}, 1);

    await getAnalyticsTopProducts({}, 200);
    expect(getTopProducts).toHaveBeenCalledWith({}, 100);

    await getAnalyticsTopProducts({}, 50);
    expect(getTopProducts).toHaveBeenCalledWith({}, 50);
  });
});

describe("getAnalyticsTopUsers", () => {
  it("returns users array with cost", async () => {
    getTopUsers.mockResolvedValueOnce([
      { userId: "u1", email: "alice@example.com", scanCount: 20, cost: 1.5 },
      { userId: "u2", email: "bob@example.com", scanCount: 10, cost: 0.75 },
    ]);

    const result = await getAnalyticsTopUsers({});
    expect(result.users).toHaveLength(2);
    expect(result.users[0]!.scanCount).toBe(20);
    expect(result.users[0]!.cost).toBe(1.5);
  });

  it("clamps limit between 1 and 100", async () => {
    getTopUsers.mockResolvedValueOnce([]);
    await getAnalyticsTopUsers({}, 0);
    expect(getTopUsers).toHaveBeenCalledWith({}, 1);
  });
});

describe("getAnalyticsApiUsage", () => {
  it("returns keys array", async () => {
    getApiUsage.mockResolvedValueOnce([
      { apiKeyIndex: 1, calls: 50, inputTokens: 60000, outputTokens: 15000, cost: 2.5 },
      { apiKeyIndex: 2, calls: 30, inputTokens: 36000, outputTokens: 9000, cost: 1.5 },
    ]);

    const result = await getAnalyticsApiUsage({});
    expect(result.keys).toHaveLength(2);
    expect(result.keys[0]!.apiKeyIndex).toBe(1);
    expect(result.keys[0]!.calls).toBe(50);
  });

  it("passes date range to repository", async () => {
    getApiUsage.mockResolvedValueOnce([]);
    await getAnalyticsApiUsage({ from: "2026-01-01", to: "2026-01-31" });
    expect(getApiUsage).toHaveBeenCalledWith({ from: "2026-01-01", to: "2026-01-31" });
  });
});
