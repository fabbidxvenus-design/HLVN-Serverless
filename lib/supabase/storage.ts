/**
 * Supabase Storage helpers.
 * Generates signed upload URLs (server-side only) and signed read URLs.
 * Storage paths include the owning user ID to make RLS-compatible paths easy.
 */

import { supabaseAdmin } from "./admin";

const SCANS_BUCKET = "scans";

/** Build a storage path for a scan image. */
export function buildScanStoragePath(userId: string, fileName: string): string {
  const sanitised = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.+/g, ".");
  const safeFileName = sanitised.replace(/^\.+/, "") || "scan.jpg";
  return `${SCANS_BUCKET}/${userId}/${crypto.randomUUID()}_${safeFileName}`;
}

/**
 * Generate a signed upload URL for a scan image.
 * Requires the user to be authenticated (checked at the route level).
 *
 * @param userId        Owning user ID (used in storage path).
 * @param fileName      Original filename (used for extension).
 * @param contentType   MIME type (image/jpeg, image/png, image/webp).
 * @param sizeBytes     File size in bytes (for validation).
 * @param expiresInSecs URL valid duration; defaults to 15 minutes.
 */
export async function generateUploadUrl(
  userId: string,
  fileName: string,
  contentType: string,
  _sizeBytes: number,
  expiresInSecs = 900,
): Promise<{ uploadUrl: string; storagePath: string }> {
  const storagePath = buildScanStoragePath(userId, fileName);

  const { data, error } = await supabaseAdmin.storage
    .from(SCANS_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });

  if (error || !data) {
    throw new Error(`Failed to generate upload URL: ${error?.message ?? "unknown"}`);
  }

  return {
    uploadUrl: data.signedUrl,
    storagePath,
  };
}

/**
 * Generate a short-lived signed read URL for a storage object.
 * Used by scan detail responses so clients can display images.
 */
export async function generateReadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(SCANS_BUCKET)
    .createSignedUrl(storagePath, 3600); // 1 hour

  if (error || !data) {
    throw new Error(`Failed to generate read URL: ${error?.message ?? "unknown"}`);
  }

  return data.signedUrl;
}

/**
 * Delete a storage object (e.g., on scan deletion).
 * Best-effort; errors are logged but not thrown to avoid blocking the primary operation.
 */
export async function deleteStorageObject(storagePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(SCANS_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error(`[storage] Failed to delete ${storagePath}: ${error.message}`);
  }
}