-- Migration: 006_create_scans_bucket.sql
-- Creates the scans storage bucket for scan thumbnail images.

-- Create the scans bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scans',
  'scans',
  false, -- private bucket, requires signed URLs
  10485760, -- 10 MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
