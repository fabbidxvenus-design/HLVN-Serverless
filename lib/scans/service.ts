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
import { deleteStorageObject, generateReadUrl } from "@/lib/supabase/storage";
import type { ScanRecord, OCRStructured } from "@/types/scan";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/api/errors";

export { type ScanListFilters, type PaginatedScans };

/**
 * Storage-path pattern: scans/<userId>/<filename with optional prefix>
 * Allows null/undefined for no-image scans.
 */
const STORAGE_PATH_RE = /^scans\/[a-zA-Z0-9-]+\/.+/;

function isValidStoragePath(path: string): boolean {
  return STORAGE_PATH_RE.test(path) && !path.includes("..");
}

/**
 * Convert a repository ScanRecord (raw storage path or base64) to a client-facing record.
 * - If imageUrl is a storage path (scans/...), sign it into a read URL
 * - If imageUrl is base64 (data:image/...), return as-is
 * - Otherwise return null
 */
async function toClientScan(scan: ScanRecord): Promise<ScanRecord> {
  if (!scan.imageUrl) {
    return { ...scan, imageUrl: null };
  }

  // Base64 data URL - return as-is
  if (scan.imageUrl.startsWith('data:image/')) {
    return scan;
  }

  // Storage path - sign it
  if (!isValidStoragePath(scan.imageUrl)) {
    return { ...scan, imageUrl: null };
  }

  try {
    const signedUrl = await generateReadUrl(scan.imageUrl);
    return { ...scan, imageUrl: signedUrl };
  } catch (error) {
    console.warn("[scans] Failed to generate signed read URL", {
      scanId: scan.id,
      userId: scan.userId,
      storagePath: scan.imageUrl,
      error,
    });
    return { ...scan, imageUrl: null };
  }
}

/**
 * List scans — admin sees all, non-admin sees only their own.
 * Returns client-facing records with signed image URLs.
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

  const result = await listScans(filters);
  const scans = await Promise.all(result.scans.map(toClientScan));
  return { ...result, scans };
}

/**
 * Get a scan by ID — owner or admin only.
 * Returns client-facing record with signed image URL.
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

  return toClientScan(scan);
}

/**
 * Create a new scan record.
 * Enforces that imageUrl, if provided, must be a storage path owned by the requesting user.
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

  // Validate imageUrl: allow null/undefined, base64 data URLs, or user-owned storage paths
  if (imageUrl !== null && imageUrl !== undefined) {
    if (typeof imageUrl !== "string") {
      throw new ValidationError("imageUrl must be a string or null");
    }

    // Allow base64 data URLs (from localStorage)
    if (imageUrl.startsWith('data:image/')) {
      // Base64 data URLs are allowed for any user (no ownership check needed)
    }
    // Allow storage paths (must belong to user)
    else if (!isValidStoragePath(imageUrl)) {
      throw new ValidationError(
        "imageUrl must be a storage path matching scans/<userId>/<file>",
      );
    } else if (!imageUrl.startsWith(`scans/${userId}/`)) {
      throw new ValidationError("imageUrl must belong to the requesting user");
    }
  }

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
  const scan = await createScan(userId, repoPayload);
  return toClientScan(scan);
}

/**
 * Update a scan's OCR output — owner or admin only.
 * Returns client-facing record with signed image URL.
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

  const updated = await updateScan(scanId, ocrStructured);
  return toClientScan(updated);
}

/**
 * Delete a scan — admin only.
 * Storage path extraction works for both signed read URLs and raw storage paths.
 */
export async function deleteScanService(scanId: string): Promise<string> {
  const scan = await getScanById(scanId);
  if (!scan) throw new NotFoundError(`Scan ${scanId} not found`);

  // scan.imageUrl may be a signed URL or raw storage path.
  // Delete only when we can validate a safe storage path.
  if (scan.imageUrl) {
    const extractedPath = extractStoragePath(scan.imageUrl);
    const storagePath = extractedPath ?? (isValidStoragePath(scan.imageUrl) ? scan.imageUrl : null);
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