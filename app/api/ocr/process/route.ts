/**
 * POST /api/ocr/process
 * OCR proxy — calls Google Gemini with vision model.
 * Uses key fallback + retry for resilience.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { callGemini, type GeminiRequest } from "@/lib/ocr/gemini";
import { FetchError, withRetry } from "@/lib/ocr/retry";
import { withKeyFallback, loadApiKeys } from "@/lib/ocr/key-fallback";
import { parseOCRResponse } from "@/lib/ocr/parse";
import { calculateCost } from "@/lib/ocr/token-usage";
import { ok, fail } from "@/lib/api/response";
import { QuotaError, ProviderError, ValidationError } from "@/lib/api/errors";
import { getClientIp, isRateLimited } from "@/lib/api/rate-limit";
import type { OCRProcessRequest } from "@/types/ocr";
import type { OCRModelTier } from "@/types/ocr";

const OCR_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const OCR_RATE_LIMIT_PER_USER = 10;
const OCR_RATE_LIMIT_PER_IP = 30;
const GEMINI_ATTEMPT_TIMEOUT_MS = 8_000;

export async function POST(req: NextRequest) {
  // Auth required
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  const clientIp = getClientIp(req);
  if (
    isRateLimited(`ocr:user:${user.id}`, OCR_RATE_LIMIT_PER_USER, OCR_RATE_LIMIT_WINDOW_MS) ||
    isRateLimited(`ocr:ip:${clientIp}`, OCR_RATE_LIMIT_PER_IP, OCR_RATE_LIMIT_WINDOW_MS)
  ) {
    return NextResponse.json(fail("Too many OCR requests. Please try again later.", "RATE_LIMITED"), { status: 429 });
  }

  let body: OCRProcessRequest;
  try {
    body = await req.json() as unknown as OCRProcessRequest;
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "VALIDATION_ERROR"), { status: 400 });
  }

  if (typeof body.imageBase64 !== "string" || body.imageBase64.length === 0) {
    return NextResponse.json(
      fail("imageBase64 is required", "VALIDATION_ERROR"),
      { status: 400 },
    );
  }

  if (body.imageUrl) {
    return NextResponse.json(
      fail("imageUrl OCR input is disabled", "VALIDATION_ERROR"),
      { status: 400 },
    );
  }

  const modelTier: OCRModelTier = body.modelTier ?? "default";
  const processBody = { ...body, imageBase64: body.imageBase64 };

  try {
    const result = await processOCR(processBody);

    return NextResponse.json(
      ok({
        ocrRaw: result.ocrRaw,
        ocrStructured: result.ocrStructured,
        tokenUsage: result.tokenUsage,
        apiKeyIndex: result.apiKeyIndex,
        model: result.model,
      }),
    );
  } catch (err) {
    if (err instanceof QuotaError) {
      return NextResponse.json(fail(err.message, err.code), { status: 429 });
    }
    if (err instanceof ProviderError) {
      console.error("[ocr/process] ProviderError:", { code: err.code });
      return NextResponse.json(fail("External OCR service error", err.code), { status: 502 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json(fail(err.message, err.code), { status: 400 });
    }
    console.error("[ocr/process] Unexpected error:", getSafeOCRKeyError(err));
    return NextResponse.json(
      fail("OCR processing failed; please try again", "PROVIDER_ERROR"),
      { status: 502 },
    );
  }
}

// ── Internal processing ─────────────────────────────────────────────────────────

interface OCRResult {
  ocrRaw: string;
  ocrStructured: import("@/types/scan").OCRStructured;
  tokenUsage: import("@/types/scan").TokenUsage;
  apiKeyIndex: number;
  model: string;
}

interface ValidatedOCRProcessRequest extends OCRProcessRequest {
  imageBase64: string;
}

function getSafeOCRKeyError(err: unknown): { status?: number; name: string; message: string } {
  if (err instanceof FetchError) {
    return { status: err.status, name: err.name, message: err.message };
  }
  if (err instanceof Error) {
    return { name: err.name, message: err.message };
  }
  return { name: "UnknownError", message: "Unknown OCR key failure" };
}

async function callGeminiWithTimeout(apiKey: string, req: GeminiRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_ATTEMPT_TIMEOUT_MS);

  try {
    return await callGemini(apiKey, req, controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function processOCR(body: ValidatedOCRProcessRequest): Promise<OCRResult> {
  const keys = loadApiKeys();

  const { apiKeyIndex, result } = await withKeyFallback(
    keys,
    async (keyInfo) => {
      const tier: OCRModelTier = body.modelTier ?? "default";

      const req: GeminiRequest = {
        modelTier: tier,
        imageBase64: body.imageBase64,
      };

      const geminiRes = await withRetry(
        () => callGeminiWithTimeout(keyInfo.key, req),
        { maxAttempts: 1, baseDelayMs: 300, maxDelayMs: 500 },
      );

      const rawContent =
        geminiRes.choices[0]?.message?.content ??
        (() => { throw new ProviderError("Empty response from OCR provider"); })();

      const parsed = parseOCRResponse(
        rawContent,
        geminiRes.usage,
        geminiRes.model,
      );

      const inputTokens = parsed.usage.input;
      const outputTokens = parsed.usage.output;
      const costTier = tier as "free" | "default" | "high";
      const cost = calculateCost(inputTokens, outputTokens, costTier);

      return {
        apiKeyIndex: keyInfo.index,
        result: {
          ocrRaw: parsed.ocrRaw,
          ocrStructured: parsed.ocrStructured,
          tokenUsage: {
            input: inputTokens,
            output: outputTokens,
            cost,
            model: parsed.model,
          },
          model: parsed.model,
        },
      };
    },
    (keyIndex, err, retryable) => {
      if (!retryable) return;
      console.warn("[ocr] Key fallback triggered", {
        keyIndex,
        retryable,
        error: getSafeOCRKeyError(err),
      });
    },
  );

  return { ...result, apiKeyIndex };
}