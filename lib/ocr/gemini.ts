/**
 * Google Gemini API client for OCR vision requests.
 */

import type { OCRModelTier } from "@/types/ocr";
import { FetchError } from "@/lib/ocr/retry";

export interface GeminiRequest {
  imageBase64?: string;
  imageUrl?: string;
  modelTier: OCRModelTier;
  systemPrompt?: string;
  userPrompt?: string;
}

export interface GeminiResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_MAX_OUTPUT_TOKENS = 1536;

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

interface ImageData {
  mimeType: string;
  data: string;
}

const MAX_IMAGE_BASE64_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BASE64_CHARS = Math.ceil(MAX_IMAGE_BASE64_BYTES * 4 / 3) + 128;
const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const DEFAULT_SYSTEM_PROMPT = `Extract text from the document image and return only valid JSON.
Schema: {"title":"string","fields":[{"field":"string","value":"string","confidence":"high|medium|low","category":"main|other"}],"sizes":[{"size":"string","quantity":number}],"notes":["string"]}
Use category "main" for barcode, product/code, lot, contract/order, quantity, size, price, date, unit. Use "other" for supplementary metadata or notes.
Only output fields with a readable label and matching value; never use the label as its own value. Put unlabeled values in notes.
Combine repeated size/quantity rows into one main field like {"field":"サイズ / 数量","value":"M: 10, L: 10","confidence":"high","category":"main"} and also populate sizes.
Omit unreadable empty fields or use low confidence with empty value. Category is required for every field. No markdown or explanation.`;

const DEFAULT_USER_PROMPT =
  "Extract OCR fields from this image. JSON only.";

export async function callGemini(
  apiKey: string,
  req: GeminiRequest,
  signal?: AbortSignal,
): Promise<GeminiResponse> {
  const image = await getImageData(req);
  const prompt = `${req.systemPrompt ?? DEFAULT_SYSTEM_PROMPT}\n\n${req.userPrompt ?? DEFAULT_USER_PROMPT}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: image.mimeType, data: image.data } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: signal ?? null,
    },
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => undefined);
    throw new FetchError(res.status, `Gemini HTTP ${res.status}: ${res.statusText}`, errorText);
  }

  const data = await res.json() as GeminiGenerateContentResponse;
  const content = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim() ?? "";

  return {
    id: "gemini-generate-content",
    model: GEMINI_MODEL,
    choices: [
      {
        message: { role: "assistant", content },
        finish_reason: data.candidates?.[0]?.finishReason ?? "unknown",
      },
    ],
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens: data.usageMetadata?.totalTokenCount ?? 0,
    },
  };
}

async function getImageData(req: GeminiRequest): Promise<ImageData> {
  if (req.imageBase64) {
    return parseBase64Image(req.imageBase64);
  }

  if (req.imageUrl) {
    throw new FetchError(400, "imageUrl OCR input is disabled; send imageBase64 instead");
  }

  throw new Error("One of imageBase64 or imageUrl is required");
}

function parseBase64Image(imageBase64: string): ImageData {
  if (imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
    throw new FetchError(400, "Image payload size is invalid");
  }

  const dataUriMatch = imageBase64.match(/^data:([^;,]+);base64,(.+)$/);
  const mimeType = dataUriMatch?.[1] ?? "image/jpeg";
  const data = dataUriMatch?.[2] ?? imageBase64;

  if (!SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new FetchError(400, `Unsupported image type: ${mimeType}`);
  }

  const imageBytes = Buffer.byteLength(data, "base64");
  if (imageBytes === 0 || imageBytes > MAX_IMAGE_BASE64_BYTES) {
    throw new FetchError(400, "Image payload size is invalid");
  }

  return { mimeType, data };
}
