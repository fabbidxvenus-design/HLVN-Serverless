/**
 * GET /api/scans — list scans
 * POST /api/scans — create scan record
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listScansService, createScanService } from "@/lib/scans/service";
import { buildSearchFilters } from "@/lib/scans/search";
import { ok, fail } from "@/lib/api/response";
import { toApiError } from "@/lib/api/errors";
import type { ScanRecord, OCRStructured, TokenUsage } from "@/types/scan";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  const url = new URL(req.url);
  // buildSearchFilters expects only present strings; omit null/undefined entries
  const filterParams: { page?: string; limit?: string; search?: string; userId?: string; from?: string; to?: string } = {};
  const rawPage = url.searchParams.get("page");
  if (rawPage !== null) filterParams.page = rawPage;
  const rawLimit = url.searchParams.get("limit");
  if (rawLimit !== null) filterParams.limit = rawLimit;
  const rawSearch = url.searchParams.get("search");
  if (rawSearch !== null) filterParams.search = rawSearch;
  const rawUserId = url.searchParams.get("userId");
  if (rawUserId !== null) filterParams.userId = rawUserId;
  const rawFrom = url.searchParams.get("from");
  if (rawFrom !== null) filterParams.from = rawFrom;
  const rawTo = url.searchParams.get("to");
  if (rawTo !== null) filterParams.to = rawTo;
  const filters = buildSearchFilters(filterParams);

  try {
    const result = await listScansService(filters, user.id, user.role);
    return NextResponse.json(
      ok(result.scans, {
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        total: result.total,
        hasMore: result.hasMore,
      }),
    );
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(fail(apiErr.message, apiErr.code), { status: apiErr.status });
  }
}

interface CreateScanBody {
  imageUrl?: unknown;
  ocrRaw?: unknown;
  ocrStructured?: unknown;
  tokenUsage?: unknown;
  apiKeyIndex?: unknown;
  timestamp?: unknown;
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  let body: CreateScanBody;
  try {
    body = await req.json() as unknown as CreateScanBody;
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "VALIDATION_ERROR"), { status: 400 });
  }

  // Required fields
  if (typeof body.ocrRaw !== "string" || !body.ocrRaw) {
    return NextResponse.json(fail("ocrRaw is required", "VALIDATION_ERROR"), { status: 400 });
  }
  if (!body.ocrStructured || typeof body.ocrStructured !== "object") {
    return NextResponse.json(fail("ocrStructured is required", "VALIDATION_ERROR"), { status: 400 });
  }
  if (typeof body.tokenUsage !== "object" || body.tokenUsage === null) {
    return NextResponse.json(fail("tokenUsage is required", "VALIDATION_ERROR"), { status: 400 });
  }
  if (typeof body.apiKeyIndex !== "number") {
    return NextResponse.json(fail("apiKeyIndex is required and must be a number", "VALIDATION_ERROR"), { status: 400 });
  }

  // Optional timestamp validation
  if (body.timestamp !== undefined && typeof body.timestamp !== "string") {
    return NextResponse.json(fail("timestamp must be an ISO string", "VALIDATION_ERROR"), { status: 400 });
  }

  try {
    const pTimestamp = body.timestamp as string | undefined;
    const scan = await createScanService(user.id, {
      imageUrl: body.imageUrl as string | null,
      ocrRaw: body.ocrRaw as string,
      ocrStructured: body.ocrStructured as OCRStructured,
      tokenUsage: body.tokenUsage as TokenUsage,
      apiKeyIndex: body.apiKeyIndex as number,
      ...(pTimestamp !== undefined ? { timestamp: pTimestamp } : {}),
    });
    return NextResponse.json(ok(scan), { status: 201 });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(fail(apiErr.message, apiErr.code), { status: apiErr.status });
  }
}