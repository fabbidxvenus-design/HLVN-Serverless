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
import type { OCRStructured, TokenUsage } from "@/types/scan";

const OCR_CONFIDENCE_VALUES = new Set(["high", "medium", "low"]);
const OCR_CATEGORY_VALUES = new Set(["main", "other"]);

function isTokenUsage(value: unknown): value is TokenUsage {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.input !== "number" || !Number.isFinite(record.input)) return false;
  if (typeof record.output !== "number" || !Number.isFinite(record.output)) return false;
  if (typeof record.cost !== "number" || !Number.isFinite(record.cost)) return false;
  if (record.model !== undefined && typeof record.model !== "string") return false;
  return true;
}

function isOCRStructured(value: unknown): value is OCRStructured {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;

  if (record.title !== undefined && typeof record.title !== "string") return false;
  if (record.rawText !== undefined && typeof record.rawText !== "string") return false;

  if (record.notes !== undefined) {
    if (!Array.isArray(record.notes) || !record.notes.every((note) => typeof note === "string")) return false;
  }

  if (!Array.isArray(record.fields) || !Array.isArray(record.sizes)) return false;

  const hasValidFields = record.fields.every((field) => {
    if (!field || typeof field !== "object") return false;
    const fieldRecord = field as Record<string, unknown>;
    if (typeof fieldRecord.field !== "string") return false;
    if (typeof fieldRecord.value !== "string") return false;
    if (fieldRecord.confidence !== undefined && !OCR_CONFIDENCE_VALUES.has(String(fieldRecord.confidence))) return false;
    if (fieldRecord.category !== undefined && !OCR_CATEGORY_VALUES.has(String(fieldRecord.category))) return false;
    return true;
  });

  if (!hasValidFields) return false;

  return record.sizes.every((sizeEntry) => {
    if (!sizeEntry || typeof sizeEntry !== "object") return false;
    const sizeRecord = sizeEntry as Record<string, unknown>;
    return typeof sizeRecord.size === "string" && typeof sizeRecord.quantity === "number" && Number.isFinite(sizeRecord.quantity);
  });
}

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
  imageDataUrl?: unknown;
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
  if (!isOCRStructured(body.ocrStructured)) {
    return NextResponse.json(fail("ocrStructured is invalid", "VALIDATION_ERROR"), { status: 400 });
  }
  if (!isTokenUsage(body.tokenUsage)) {
    return NextResponse.json(fail("tokenUsage is invalid", "VALIDATION_ERROR"), { status: 400 });
  }
  if (typeof body.apiKeyIndex !== "number" || !Number.isInteger(body.apiKeyIndex) || body.apiKeyIndex < 0) {
    return NextResponse.json(fail("apiKeyIndex is required and must be a non-negative integer", "VALIDATION_ERROR"), { status: 400 });
  }

  // Optional timestamp validation
  if (body.timestamp !== undefined && typeof body.timestamp !== "string") {
    return NextResponse.json(fail("timestamp must be an ISO string", "VALIDATION_ERROR"), { status: 400 });
  }

  // Optional imageUrl validation: if present, must be string or null (service enforces path rules)
  if (body.imageUrl !== undefined && body.imageUrl !== null && typeof body.imageUrl !== "string") {
    return NextResponse.json(fail("imageUrl must be a string or null", "VALIDATION_ERROR"), { status: 400 });
  }

  // Optional imageDataUrl validation: if present, must be base64 data URL string
  if (body.imageDataUrl !== undefined && body.imageDataUrl !== null && typeof body.imageDataUrl !== "string") {
    return NextResponse.json(fail("imageDataUrl must be a string or null", "VALIDATION_ERROR"), { status: 400 });
  }

  const pTimestamp = typeof body.timestamp === "string" ? body.timestamp : undefined;

  // Prefer imageDataUrl (base64 from localStorage) over imageUrl (storage path)
  const pImageUrl: string | null =
    typeof body.imageDataUrl === "string" ? body.imageDataUrl :
    body.imageUrl === null ? null :
    typeof body.imageUrl === "string" ? body.imageUrl : null;

  const ocrRaw = body.ocrRaw;
  const ocrStructured = body.ocrStructured;
  const tokenUsage = body.tokenUsage;
  const apiKeyIndex = body.apiKeyIndex;

  try {
    const scan = await createScanService(user.id, {
      imageUrl: pImageUrl,
      ocrRaw,
      ocrStructured,
      tokenUsage,
      apiKeyIndex,
      ...(pTimestamp !== undefined ? { timestamp: pTimestamp } : {}),
    });
    return NextResponse.json(ok(scan), { status: 201 });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(fail(apiErr.message, apiErr.code), { status: apiErr.status });
  }
}