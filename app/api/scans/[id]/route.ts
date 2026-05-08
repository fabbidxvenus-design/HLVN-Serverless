/**
 * GET    /api/scans/[id] — get scan by ID
 * PATCH  /api/scans/[id] — update scan (edit OCR output)
 * DELETE /api/scans/[id] — delete scan (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getScanService, updateScanService, deleteScanService } from "@/lib/scans/service";
import { ok, fail } from "@/lib/api/response";
import { toApiError } from "@/lib/api/errors";
import type { OCRStructured } from "@/types/scan";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  const { id } = await params;

  try {
    const scan = await getScanService(id, user.id, user.role);
    return NextResponse.json(ok(scan));
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(fail(apiErr.message, apiErr.code), { status: apiErr.status });
  }
}

interface PatchBody {
  ocrStructured?: unknown;
  edited?: unknown;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  let body: PatchBody;
  try {
    body = await req.json() as unknown as PatchBody;
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "VALIDATION_ERROR"), { status: 400 });
  }

  if (!body.ocrStructured || typeof body.ocrStructured !== "object") {
    return NextResponse.json(fail("ocrStructured is required", "VALIDATION_ERROR"), { status: 400 });
  }

  const { id } = await params;

  try {
    const scan = await updateScanService(
      id,
      body.ocrStructured as OCRStructured,
      user.id,
      user.role,
    );
    return NextResponse.json(ok(scan));
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(fail(apiErr.message, apiErr.code), { status: apiErr.status });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  // Only admins can delete scans
  if (user.role !== "admin") {
    return NextResponse.json(fail("Admin access required", "FORBIDDEN"), { status: 403 });
  }

  const { id } = await params;

  try {
    await deleteScanService(id);
    return NextResponse.json(ok({ deleted: true, id }));
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(fail(apiErr.message, apiErr.code), { status: apiErr.status });
  }
}