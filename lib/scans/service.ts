/**
 * Scan service — business logic for scan management.
 * Enforces owner/admin access control.
 */

import {
  listScans,
  getScanById,
  createScan,
  updateScan,
  deleteScan,
  getStoragePathsForUser,
  type ScanListFilters,
  type PaginatedScans,
} from "@/lib/scans/repository";
import { deleteStorageObject } from "@/lib/supabase/storage";
import type { ScanRecord, OCRStructured } from "@/types/scan";
import { NotFoundError, ForbiddenError } from "@/lib/api/errors";

export { type ScanListFilters, type PaginatedScans };

/**
 * List scans — admin sees all, non-admin sees only their own.
 */
export async function listScansService(
  filters: ScanListFilters,
  requestingUserId: string,
  requestingUserRole: "admin" | "manager" | "user",
): Promise<PaginatedScans> {
  // Non-admin users can only filter by their own userId
  if (requestingUserRole !== "admin") {
    filters.userId = requestingUserId;
  }

  return listScans(filters);
}

/**
 * Get a scan by ID — owner or admin only.
 */
export async function getScanService(
  scanId: string,
  requestingUserId: string,
  requestingUserRole: "admin" | "manager" | "user",
): Promise<ScanRecord> {
  const scan = await getScanById(scanId);
  if (!scan) throw new NotFoundError(`Scan ${scanId} not found`);

  if (requestingUserRole !== "admin" && scan.userId !== requestingUserId) {
    throw new ForbiddenError("You do not have access to this scan");
  }

  return scan;
}

/**
 * Create a new scan record.
 */
export async function createScanService(
  userId: string,
  payload: {
    imageUrl?: string | null;
    ocrRaw: string;
    ocrStructured: OCRStructured;
    tokenUsage: ScanRecord["tokenUsage"];
    apiKeyIndex: number;
    timestamp?: string;
  },
): Promise<ScanRecord> {
  const { imageUrl, ocrRaw, ocrStructured, tokenUsage, apiKeyIndex, timestamp } = payload;
  const repoPayload: Parameters<typeof createScan>[1] = {
    imageUrl: imageUrl ?? null,
    ocrRaw,
    ocrStructured,
    tokenUsage,
    apiKeyIndex,
  };
  if (timestamp !== undefined) {
    repoPayload.timestamp = timestamp;
  }
  return createScan(userId, repoPayload);
}

/**
 * Update a scan's OCR output — owner or admin only.
 */
export async function updateScanService(
  scanId: string,
  ocrStructured: OCRStructured,
  requestingUserId: string,
  requestingUserRole: "admin" | "manager" | "user",
): Promise<ScanRecord> {
  const scan = await getScanById(scanId);
  if (!scan) throw new NotFoundError(`Scan ${scanId} not found`);

  if (requestingUserRole !== "admin" && scan.userId !== requestingUserId) {
    throw new ForbiddenError("You do not have access to edit this scan");
  }

  return updateScan(scanId, ocrStructured);
}

/**
 * Delete a scan — admin only.
 */
export async function deleteScanService(scanId: string): Promise<string> {
  const scan = await getScanById(scanId);
  if (!scan) throw new NotFoundError(`Scan ${scanId} not found`);

  // Clean up storage object if present
  if (scan.imageUrl) {
    // Extract storage path from public URL — best effort
    const storagePath = extractStoragePath(scan.imageUrl);
    if (storagePath) {
      await deleteStorageObject(storagePath);
    }
  }

  await deleteScan(scanId);
  return scanId;
}

/**
 * Delete all scans + storage for a user (used when deleting a user).
 */
export async function deleteStorageForUser(userId: string): Promise<void> {
  const paths = await getStoragePathsForUser(userId);
  await Promise.all(paths.map(deleteStorageObject));
}

// ── Internal ──────────────────────────────────────────────────────────────────

/**
 * Extract the storage path from a Supabase storage public URL.
 * e.g. https://xxx.supabase.co/storage/v1/object/public/scans/user-id/file.jpg
 *   → scans/user-id/file.jpg
 */
function extractStoragePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    // Path is everything after /storage/v1/object/public/
    const parts = url.pathname.split("/storage/v1/object/public/");
    return parts[1] ?? null;
  } catch {
    return null;
  }
}