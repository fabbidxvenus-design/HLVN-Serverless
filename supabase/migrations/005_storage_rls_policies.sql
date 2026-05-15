-- Migration: 005_storage_rls_policies.sql
-- Adds RLS policies for the scans storage bucket.
-- Required for createSignedUploadUrl to work.
--
-- Note: Storage RLS policies live on storage.objects, not on the bucket itself.
-- createSignedUploadUrl needs an INSERT policy on storage.objects.

BEGIN;

-- ── Scans bucket: INSERT for createSignedUploadUrl ─────────────────────────

-- Service role can create signed upload URLs (bypasses RLS, but explicit helps clarity)
-- and is also needed when supabaseAdmin client doesn't bypass RLS for storage ops.
CREATE POLICY "Service role can insert scan objects"
  ON storage.objects FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Fallback: authenticated users can upload to their own user folder
-- This handles the case where the client passes an authenticated user token
CREATE POLICY "Authenticated users can upload to own scan folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND name LIKE 'scans/' || auth.uid()::text || '/%'
  );

-- ── Scans bucket: SELECT for signed read URLs ───────────────────────────────

CREATE POLICY "Service role can select scan objects"
  ON storage.objects FOR SELECT
  USING (auth.role() = 'service_role');

-- Authenticated users can read their own scans
CREATE POLICY "Authenticated users can read own scans"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'scans'
    AND name LIKE 'scans/' || auth.uid()::text || '/%'
  );

-- ── Scans bucket: DELETE ─────────────────────────────────────────────────────

CREATE POLICY "Service role can delete scan objects"
  ON storage.objects FOR DELETE
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can delete own scans"
  ON storage.objects FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND name LIKE 'scans/' || auth.uid()::text || '/%'
  );

COMMIT;