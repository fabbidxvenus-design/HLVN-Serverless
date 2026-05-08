/**
 * POST /api/scans/upload-url
 * Generate a signed URL for direct client-to-storage upload.
 * The client uploads directly to Supabase Storage; no multipart handling needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { generateUploadUrl } from "@/lib/supabase/storage";
import { ok, fail } from "@/lib/api/response";
import { isFileContentType, isFileSizeBytes, isRequiredString } from "@/lib/api/validation";
import { ValidationError } from "@/lib/api/errors";

interface UploadUrlBody {
  fileName?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
}

// Max upload size: 10 MB
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  let body: UploadUrlBody;
  try {
    body = await req.json() as unknown as UploadUrlBody;
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "VALIDATION_ERROR"), { status: 400 });
  }

  const fileNameErr = isRequiredString(body.fileName, 1, 255);
  const contentTypeErr = isFileContentType(body.contentType, ALLOWED_CONTENT_TYPES);
  const sizeErr = isFileSizeBytes(body.sizeBytes, MAX_FILE_SIZE_BYTES);

  if (fileNameErr) return NextResponse.json(fail(fileNameErr, "VALIDATION_ERROR"), { status: 400 });
  if (contentTypeErr) return NextResponse.json(fail(contentTypeErr, "VALIDATION_ERROR"), { status: 400 });
  if (sizeErr) return NextResponse.json(fail(sizeErr, "VALIDATION_ERROR"), { status: 400 });

  try {
    const result = await generateUploadUrl(
      user.id,
      body.fileName as string,
      body.contentType as string,
      body.sizeBytes as number,
    );

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    return NextResponse.json(
      ok({
        uploadUrl: result.uploadUrl,
        storagePath: result.storagePath,
        expiresAt,
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to generate upload URL";
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}