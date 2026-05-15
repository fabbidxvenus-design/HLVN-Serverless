/**
 * POST /api/scans/upload
 * Accepts multipart form data with an image file.
 * Uploads directly to Supabase Storage using the service-role client,
 * bypassing RLS issues with createSignedUploadUrl.
 *
 * Returns the storage path for the uploaded image.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildScanStoragePath } from "@/lib/supabase/storage";
import { ok, fail } from "@/lib/api/response";

const SCANS_BUCKET = "scans";
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(fail("Invalid multipart form data", "VALIDATION_ERROR"), { status: 400 });
  }

  const image = formData.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json(fail("No image file provided", "VALIDATION_ERROR"), { status: 400 });
  }

  const file = image;
  const contentType = file.type || "image/jpeg";
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json(fail("Invalid file type. Allowed: image/jpeg, image/png, image/webp", "VALIDATION_ERROR"), { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(fail("File too large. Maximum size: 10 MB", "VALIDATION_ERROR"), { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = buildScanStoragePath(user.id, file.name);
    if (storagePath.includes("..")) {
      return NextResponse.json(fail("Invalid storage path: path traversal not allowed", "VALIDATION_ERROR"), { status: 400 });
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from(SCANS_BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw uploadError;
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    return NextResponse.json(
      ok({
        storagePath,
        expiresAt,
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to upload image";
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}