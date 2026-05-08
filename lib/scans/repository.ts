/**
 * Scan repository — data access layer for the `scans` table.
 * Uses service-role client (RLS bypassed); service layer enforces access control.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ScanRecord } from "@/types/scan";
import { NotFoundError } from "@/lib/api/errors";

export interface ScanListFilters {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  from?: string;
  to?: string;
}

export interface PaginatedScans {
  scans: ScanRecord[];
  total: number;
  hasMore: boolean;
}

function rowToScan(row: Record<string, unknown>): ScanRecord {
  const imageUrl = row.image_url as string | null | undefined;
  const userEmail = row.user_email as string | undefined;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    timestamp: row.timestamp as string,
    imageUrl: imageUrl ?? null,
    ocrRaw: row.ocr_raw as string,
    ocrStructured: row.ocr_structured as ScanRecord["ocrStructured"],
    tokenUsage: row.token_usage as ScanRecord["tokenUsage"],
    apiKeyIndex: row.api_key_index as number,
    edited: row.edited as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    ...(userEmail !== undefined ? { userEmail } : {}),
  };
}

/**
 * List scans with optional pagination and filtering.
 * Full-text search uses a simple ilike on ocr_raw.
 * For large datasets, replace with pg_trgm or tsvector.
 */
export async function listScans(filters: ScanListFilters = {}): Promise<PaginatedScans> {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("scans")
    .select("*", { count: "exact", head: false });

  // Filter by owner
  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }

  // Full-text search on raw OCR text
  if (filters.search) {
    query = query.ilike("ocr_raw", `%${filters.search}%`);
  }

  // Date range
  if (filters.from) {
    query = query.gte("timestamp", filters.from);
  }
  if (filters.to) {
    query = query.lte("timestamp", filters.to);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const scans: ScanRecord[] = (data ?? []).map(rowToScan);

  return {
    scans,
    total: count ?? 0,
    hasMore: offset + (data?.length ?? 0) < (count ?? 0),
  };
}

/**
 * Get a single scan by ID.
 */
export async function getScanById(id: string): Promise<ScanRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("scans")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return rowToScan(data);
}

/**
 * Create a new scan record.
 */
export async function createScan(
  userId: string,
  payload: {
    imageUrl: string | null;
    ocrRaw: string;
    ocrStructured: ScanRecord["ocrStructured"];
    tokenUsage: ScanRecord["tokenUsage"];
    apiKeyIndex: number;
    timestamp?: string;
  },
): Promise<ScanRecord> {
  const timestamp = payload.timestamp ?? new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("scans")
    .insert({
      user_id: userId,
      timestamp,
      image_url: payload.imageUrl,
      ocr_raw: payload.ocrRaw,
      ocr_structured: payload.ocrStructured,
      token_usage: payload.tokenUsage,
      api_key_index: payload.apiKeyIndex,
      edited: false,
    })
    .select()
    .single();

  if (error || !data) throw new NotFoundError("Failed to create scan record");
  return rowToScan(data);
}

/**
 * Update a scan's OCR structured output (mark as edited).
 */
export async function updateScan(
  id: string,
  ocrStructured: ScanRecord["ocrStructured"],
): Promise<ScanRecord> {
  const { data, error } = await supabaseAdmin
    .from("scans")
    .update({ ocr_structured: ocrStructured, edited: true })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new NotFoundError(`Scan ${id} not found`);
  return rowToScan(data);
}

/**
 * Delete all scans for a user.
 */
export async function deleteUserScans(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("scans").delete().eq("user_id", userId);
  if (error) throw error;
}

/**
 * Delete a single scan by ID.
 */
export async function deleteScan(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("scans").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Get storage paths for all scans of a user (for cleanup).
 */
export async function getStoragePathsForUser(
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("scans")
    .select("image_url")
    .eq("user_id", userId)
    .not("image_url", "is", null);

  if (error) throw error;
  return (data ?? [])
    .map((row) => row.image_url as string)
    .filter(Boolean);
}