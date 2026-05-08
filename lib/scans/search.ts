/**
 * Scan search utilities.
 * For Phase 02, search is implemented via ilike on ocr_raw in the repository.
 * Future: pg_trgm (fuzzy) or tsvector (full-text with ranking).
 */

import type { ScanListFilters } from "@/lib/scans/repository";

/**
 * Build a database-ready filter object from raw query params.
 * Sanitisation is done at the repository layer (ilike with escaped wildcards).
 */
export function buildSearchFilters(params: {
  page?: string;
  limit?: string;
  search?: string;
  userId?: string;
  from?: string;
  to?: string;
}): ScanListFilters {
  const page = params.page ? parseInt(params.page, 10) : 1;
  const limit = params.limit ? Math.min(100, parseInt(params.limit, 10)) : 20;
  const search: string | undefined = params.search?.trim() || undefined;
  const userId: string | undefined = params.userId || undefined;
  const from: string | undefined = params.from || undefined;
  const to: string | undefined = params.to || undefined;
  const filters: ScanListFilters = { page, limit };
  if (search !== undefined) filters.search = search;
  if (userId !== undefined) filters.userId = userId;
  if (from !== undefined) filters.from = from;
  if (to !== undefined) filters.to = to;
  return filters;
}

/**
 * Escape special characters in a search query for ilike use.
 * Only escapes % and \ which are the wildcards in LIKE/ilike.
 */
export function escapeSearchQuery(query: string): string {
  return query.replace(/[%\\]/g, "\\$&");
}