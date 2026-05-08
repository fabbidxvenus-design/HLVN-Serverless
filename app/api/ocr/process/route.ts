/**
 * POST /api/ocr/process
 * OCR proxy — calls OpenRouter with vision model.
 * Uses key fallback + retry for resilience.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { callOpenRouter, type OpenRouterRequest } from "@/lib/ocr/openrouter";
import { withRetry } from "@/lib/ocr/retry";
import { withKeyFallback, loadApiKeys } from "@/lib/ocr/key-fallback";
import { parseOCRResponse } from "@/lib/ocr/parse";
import { calculateCost } from "@/lib/ocr/token-usage";
import { ok, fail } from "@/lib/api/response";
import { QuotaError, ProviderError, ValidationError } from "@/lib/api/errors";
import type { OCRProcessRequest } from "@/types/ocr";
import type { OCRModelTier } from "@/types/ocr";

export async function POST(req: NextRequest) {
  // Auth required
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  let body: OCRProcessRequest;
  try {
    body = await req.json() as unknown as OCRProcessRequest;
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "VALIDATION_ERROR"), { status: 400 });
  }

  // Require exactly one of imageBase64 or imageUrl
  if (!body.imageBase64 && !body.imageUrl) {
    return NextResponse.json(
      fail("One of imageBase64 or imageUrl is required", "VALIDATION_ERROR"),
      { status: 400 },
    );
  }

  const modelTier: OCRModelTier = body.modelTier ?? "default";

  try {
    const result = await processOCR(body);

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
      return NextResponse.json(fail(err.message, err.code), { status: 502 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json(fail(err.message, err.code), { status: 400 });
    }
    console.error("[ocr/process] Unexpected error:", err);
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

async function processOCR(body: OCRProcessRequest): Promise<OCRResult> {
  const keys = loadApiKeys();

  const { apiKeyIndex, result } = await withKeyFallback(
    keys,
    async (keyInfo) => {
      const tier: OCRModelTier = body.modelTier ?? "default";

      // Build OpenRouter request — explicit to satisfy exactOptionalPropertyTypes
      const req: OpenRouterRequest = { modelTier: tier };
      if (body.imageBase64 !== undefined) {
        req.imageBase64 = body.imageBase64;
      }
      if (body.imageUrl !== undefined) {
        req.imageUrl = body.imageUrl;
      }

      const openRouterRes = await withRetry(
        () => callOpenRouter(keyInfo.key, req),
        { maxAttempts: 3, baseDelayMs: 1000 },
      );

      const rawContent =
        openRouterRes.choices[0]?.message?.content ??
        (() => { throw new ProviderError("Empty response from OCR provider"); })();

      const parsed = parseOCRResponse(
        rawContent,
        openRouterRes.usage,
        openRouterRes.model,
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
      console.warn(`[ocr] Key ${keyIndex} failed (${retryable ? "retryable" : "non-retryable"}):`, err);
    },
  );

  return { ...result, apiKeyIndex };
}