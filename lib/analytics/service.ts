/**
 * Analytics service — business logic layer.
 * All functions are admin-only; routes enforce RBAC before calling.
 */

import {
  getSummaryMetrics,
  getTrendData,
  getTopProducts,
  getTopUsers,
  getApiUsage,
  listScansForExport,
  type DateRange,
} from "@/lib/analytics/repository";
import type {
  AnalyticsSummary,
  AnalyticsTrends,
  TopProducts,
  TopUsers,
  APIUsage,
} from "@/types/analytics";

export { type DateRange };

const BUCKET_DEFAULTS = ["day", "week", "month"] as const;

/** Fetch aggregate summary metrics. */
export async function getAnalyticsSummary(range: DateRange): Promise<AnalyticsSummary> {
  return getSummaryMetrics(range);
}

/** Fetch trend data points. */
export async function getAnalyticsTrends(
  range: DateRange,
  bucket: string = "day",
): Promise<AnalyticsTrends> {
  const validBucket = BUCKET_DEFAULTS.includes(bucket as "day" | "week" | "month")
    ? (bucket as "day" | "week" | "month")
    : "day";
  const points = await getTrendData(range, validBucket);
  return { points };
}

/** Fetch top products by scan frequency. */
export async function getAnalyticsTopProducts(
  range: DateRange,
  limit = 10,
): Promise<TopProducts> {
  const products = await getTopProducts(range, Math.min(100, Math.max(1, limit)));
  return { products };
}

/** Fetch top users by scan count and cost. */
export async function getAnalyticsTopUsers(
  range: DateRange,
  limit = 10,
): Promise<TopUsers> {
  const users = await getTopUsers(range, Math.min(100, Math.max(1, limit)));
  return { users };
}

/** Fetch API usage by key index. */
export async function getAnalyticsApiUsage(range: DateRange): Promise<APIUsage> {
  const keys = await getApiUsage(range);
  return { keys };
}

/** Fetch scan records for Excel export. */
export async function getScansForExport(range: DateRange) {
  return listScansForExport(range);
}
