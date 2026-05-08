/**
 * OpenRouter API client.
 * Calls the OpenRouter chat completions endpoint with vision (for images).
 * Uses the multi-key fallback and retry logic from the parent OCR service.
 */

import type { OCRModelTier } from "@/types/ocr";
import { FetchError } from "@/lib/ocr/retry";

export interface OpenRouterRequest {
  imageBase64?: string;
  imageUrl?: string;
  modelTier: OCRModelTier;
  systemPrompt?: string;
  userPrompt?: string;
}

export interface OpenRouterResponse {
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

/**
 * Map model tier to actual model ID.
 * Update these as the OpenRouter model catalog evolves.
 */
const MODEL_MAP: Record<OCRModelTier, string> = {
  free: "anthropic/claude-3-haiku",
  default: "anthropic/claude-3.5-sonnet",
  high: "anthropic/claude-sonnet-4-20250514",
};

/**
 * Build the messages array for the OpenRouter API.
 * Supports both base64-encoded images and image URLs.
 */
function buildMessages(req: OpenRouterRequest): Record<string, unknown>[] {
  const system = req.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const userContent: Record<string, unknown>[] = [];

  if (req.imageBase64) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${req.imageBase64}` },
    });
  } else if (req.imageUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: req.imageUrl },
    });
  }

  userContent.push({
    type: "text",
    text: req.userPrompt ?? DEFAULT_USER_PROMPT,
  });

  return [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];
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

/**
 * Call the OpenRouter chat completions API.
 * Returns the parsed JSON response body.
 */
export async function callOpenRouter(
  apiKey: string,
  req: OpenRouterRequest,
  signal?: AbortSignal,
): Promise<OpenRouterResponse> {
  const model = MODEL_MAP[req.modelTier] ?? MODEL_MAP["default"];

  const body: Record<string, unknown> = {
    model,
    messages: buildMessages(req),
    temperature: 0.1, // low temperature for deterministic OCR
    max_tokens: 4096,
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env["OPENROUTER_SITE_URL"] ?? "https://hlvn.app",
      "X-Title": "HLVN OCR Proxy",
    },
    body: JSON.stringify(body),
    signal: signal ?? null,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => undefined);
    throw new FetchError(res.status, `OpenRouter HTTP ${res.status}: ${res.statusText}`, errorText);
  }

  return res.json() as Promise<OpenRouterResponse>;
}