/**
 * Analytics repository — raw queries against the `scans` table.
 * Uses admin client; RBAC enforced upstream at the route level.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ScanRecord, OCRStructured, TokenUsage } from "@/types/scan";

export interface DateRange {
  from?: string;
  to?: string;
}

/** Aggregate summary metrics for a date range. */
export async function getSummaryMetrics(range: DateRange = {}): Promise<{
  totalScans: number;
  activeUsers: number;
  apiCost: number;
  successRate: number;
}> {
  let query = supabaseAdmin
    .from("scans")
    .select("*", { count: "exact", head: false });

  if (range.from) query = query.gte("timestamp", range.from);
  if (range.to) query = query.lte("timestamp", range.to);

  const { data, error, count } = await query;
  if (error) throw error;

  // Count unique users
  const uniqueUsers = new Set((data ?? []).map((r) => r.user_id as string));
  const activeUsers = uniqueUsers.size;

  // Sum token costs
  const totalCost = (data ?? []).reduce<number>((sum, row) => {
    const tu = row.token_usage as TokenUsage | null;
    return sum + (tu?.cost ?? 0);
  }, 0);

  // successRate: ratio of scans that have non-trivial OCR content (> 5 chars)
  const totalScans = count ?? 0;
  const successCount = (data ?? []).filter((r) => {
    const raw = r.ocr_raw as string | undefined;
    return raw && raw.trim().length > 5;
  }).length;

  return {
    totalScans,
    activeUsers,
    apiCost: Math.round(totalCost * 100) / 100,
    successRate: totalScans > 0 ? Math.round((successCount / totalScans) * 100) / 100 : 0,
  };
}

/** Trend data points bucketed by day / week / month. */
export async function getTrendData(
  range: DateRange = {},
  bucket: "day" | "week" | "month" = "day",
): Promise<Array<{ label: string; scans: number; cost: number }>> {
  const granularity = bucket === "day" ? "YYYY-MM-DD" : bucket === "week" ? "IYYY-IW" : "YYYY-MM";

  const { data, error } = await supabaseAdmin
    .rpc("get_trend_data", {
      range_from: range.from ?? null,
      range_to: range.to ?? null,
      bucket_granularity: granularity,
    });

  if (error) {
    // Fallback: fetch all and aggregate in-process
    return aggregateInProcess(range, bucket);
  }

  return (data ?? []) as Array<{ label: string; scans: number; cost: number }>;
}

async function aggregateInProcess(
  range: DateRange,
  bucket: "day" | "week" | "month",
): Promise<Array<{ label: string; scans: number; cost: number }>> {
  let query = supabaseAdmin
    .from("scans")
    .select("timestamp, token_usage");

  if (range.from) query = query.gte("timestamp", range.from);
  if (range.to) query = query.lte("timestamp", range.to);

  const { data, error } = await query;
  if (error) throw error;

  const buckets = new Map<string, { scans: number; cost: number }>();

  for (const row of data ?? []) {
    const ts = row.timestamp as string;
    const label = truncateLabel(ts, bucket);
    const tu = row.token_usage as TokenUsage | null;
    const entry = buckets.get(label) ?? { scans: 0, cost: 0 };
    entry.scans += 1;
    entry.cost += tu?.cost ?? 0;
    buckets.set(label, entry);
  }

  return Array.from(buckets.entries())
    .map(([label, { scans, cost }]) => ({
      label,
      scans,
      cost: Math.round(cost * 100) / 100,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function truncateLabel(iso: string, bucket: "day" | "week" | "month"): string {
  if (bucket === "day") return iso.slice(0, 10);
  if (bucket === "week") {
    // Approximate: return year-week number "2026-W05"
    const d = new Date(iso);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  return iso.slice(0, 7); // month "YYYY-MM"
}

/** Top products by scan count, derived from OCR structured titles. */
export async function getTopProducts(
  range: DateRange = {},
  limit = 10,
): Promise<Array<{ name: string; count: number; lastSeen: string }>> {
  let query = supabaseAdmin
    .from("scans")
    .select("ocr_structured, timestamp");

  if (range.from) query = query.gte("timestamp", range.from);
  if (range.to) query = query.lte("timestamp", range.to);

  const { data, error } = await query;
  if (error) throw error;

  // Aggregate by title
  const productMap = new Map<string, { count: number; lastSeen: string }>();

  for (const row of data ?? []) {
    const structured = row.ocr_structured as { title?: string } | null;
    const title = structured?.title?.trim();
    if (!title) continue;

    const ts = row.timestamp as string;
    const entry = productMap.get(title) ?? { count: 0, lastSeen: "" };
    entry.count += 1;
    if (ts > entry.lastSeen) entry.lastSeen = ts;
    productMap.set(title, entry);
  }

  return Array.from(productMap.entries())
    .map(([name, { count, lastSeen }]) => ({ name, count, lastSeen }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Top users by scan count and API cost. */
export async function getTopUsers(
  range: DateRange = {},
  limit = 10,
): Promise<Array<{ userId: string; email: string; scanCount: number; cost: number }>> {
  let query = supabaseAdmin
    .from("scans")
    .select("user_id, token_usage, users!inner(email)");

  if (range.from) query = query.gte("timestamp", range.from);
  if (range.to) query = query.lte("timestamp", range.to);

  const { data, error } = await query;
  if (error) throw error;

  const userMap = new Map<string, { email: string; scanCount: number; cost: number }>();

  for (const row of data ?? []) {
    const uid = row.user_id as string;
    const userRecords = row.users as Array<{ email: string }> | null;
    const email = userRecords?.[0]?.email ?? "unknown";
    const tu = row.token_usage as TokenUsage | null;
    const entry = userMap.get(uid) ?? { email, scanCount: 0, cost: 0 };
    entry.scanCount += 1;
    entry.cost += tu?.cost ?? 0;
    userMap.set(uid, entry);
  }

  return Array.from(userMap.entries())
    .map(([userId, { email, scanCount, cost }]) => ({
      userId,
      email,
      scanCount,
      cost: Math.round(cost * 100) / 100,
    }))
    .sort((a, b) => b.scanCount - a.scanCount)
    .slice(0, limit);
}

/** API usage broken down by api_key_index. */
export async function getApiUsage(
  range: DateRange = {},
): Promise<Array<{
  apiKeyIndex: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}>> {
  let query = supabaseAdmin
    .from("scans")
    .select("api_key_index, token_usage");

  if (range.from) query = query.gte("timestamp", range.from);
  if (range.to) query = query.lte("timestamp", range.to);

  const { data, error } = await query;
  if (error) throw error;

  const keyMap = new Map<
    number,
    { calls: number; inputTokens: number; outputTokens: number; cost: number }
  >();

  for (const row of data ?? []) {
    const idx = (row.api_key_index as number) ?? 0;
    const tu = row.token_usage as TokenUsage | null;
    const entry = keyMap.get(idx) ?? { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
    entry.calls += 1;
    entry.inputTokens += tu?.input ?? 0;
    entry.outputTokens += tu?.output ?? 0;
    entry.cost += tu?.cost ?? 0;
    keyMap.set(idx, entry);
  }

  return Array.from(keyMap.entries())
    .map(([apiKeyIndex, { calls, inputTokens, outputTokens, cost }]) => ({
      apiKeyIndex,
      calls,
      inputTokens,
      outputTokens,
      cost: Math.round(cost * 100) / 100,
    }))
    .sort((a, b) => a.apiKeyIndex - b.apiKeyIndex);
}

/** List scans for export with full OCR and token data. */
export async function listScansForExport(range: DateRange = {}): Promise<
  Array<{
    id: string;
    userId: string;
    userEmail: string;
    timestamp: string;
    imageUrl: string | null;
    ocrRaw: string;
    ocrStructured: OCRStructured;
    tokenUsage: TokenUsage;
    apiKeyIndex: number;
  }>
> {
  let query = supabaseAdmin
    .from("scans")
    .select("id, user_id, timestamp, image_url, ocr_raw, ocr_structured, token_usage, api_key_index, users!inner(email)")
    .order("timestamp", { ascending: false });

  if (range.from) query = query.gte("timestamp", range.from);
  if (range.to) query = query.lte("timestamp", range.to);

  const { data, error } = await query.limit(1000);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const users = row.users as Array<{ email?: string }> | { email?: string } | null | undefined;
    const userEmail = Array.isArray(users) ? users[0]?.email : users?.email;

    return {
      id: row.id as string,
      userId: row.user_id as string,
      userEmail: userEmail ?? "unknown",
      timestamp: row.timestamp as string,
      imageUrl: (row.image_url as string | null) ?? null,
      ocrRaw: row.ocr_raw as string,
      ocrStructured: (row.ocr_structured as OCRStructured) ?? { fields: [], sizes: [], rawText: "" },
      tokenUsage: (row.token_usage as TokenUsage) ?? { input: 0, output: 0, cost: 0 },
      apiKeyIndex: (row.api_key_index as number) ?? 0,
    };
  });
}
