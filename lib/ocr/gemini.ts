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

const DEFAULT_SYSTEM_PROMPT = `You are an OCR processing assistant. Given an image of a document, extract all text and structure it as JSON with the following schema:
{
  "title": "document title if present",
  "fields": [
    { "field": "field name", "value": "extracted value", "confidence": "high|medium|low", "category": "main|other" }
  ],
  "sizes": [
    { "size": "XS|S|M|L|XL|XXL|...", "quantity": number }
  ],
  "notes": ["additional observations"]
}
Only return valid JSON. No markdown fences, no explanation.`;

const DEFAULT_USER_PROMPT =
  "Extract all text and structured data from this image. Return only JSON.";

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
      maxOutputTokens: 4096,
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
    const res = await fetch(req.imageUrl);
    if (!res.ok) {
      throw new FetchError(res.status, `Image fetch HTTP ${res.status}: ${res.statusText}`);
    }
    const contentType = res.headers.get("Content-Type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();
    return {
      mimeType: contentType.split(";")[0] ?? "image/jpeg",
      data: Buffer.from(buffer).toString("base64"),
    };
  }

  throw new Error("One of imageBase64 or imageUrl is required");
}

function parseBase64Image(imageBase64: string): ImageData {
  const dataUriMatch = imageBase64.match(/^data:([^;,]+);base64,(.+)$/);
  if (dataUriMatch) {
    return {
      mimeType: dataUriMatch[1] ?? "image/jpeg",
      data: dataUriMatch[2] ?? "",
    };
  }

  return {
    mimeType: "image/jpeg",
    data: imageBase64,
  };
}
