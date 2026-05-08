/**
 * Parse and validate the raw text output from the OCR model.
 * Handles:
 * - Markdown code blocks (```json ... ```)
 * - Bare JSON objects
 * - Partial or malformed JSON (attempts recovery)
 * - Token usage extraction
 */

import type { OCRStructured, OCRField, OCRSize } from "@/types/scan";

export interface ParseResult {
  ocrStructured: OCRStructured;
  ocrRaw: string;
  usage: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
}

/**
 * Parse the raw content string into an OCRStructured object.
 * Extracts usage info from the OpenRouter response if available.
 */
export function parseOCRResponse(
  rawContent: string,
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
  model?: string,
): ParseResult {
  const ocrRaw = rawContent.trim();
  const ocrStructured = parseStructured(ocrRaw);

  return {
    ocrStructured,
    ocrRaw,
    usage: {
      input: usage?.prompt_tokens ?? 0,
      output: usage?.completion_tokens ?? 0,
      total: usage?.total_tokens ?? 0,
    },
    model: model ?? "unknown",
  };
}

/**
 * Extract a JSON object from raw text.
 * Tries markdown-wrapped JSON, then bare JSON, then partial recovery.
 */
export function parseStructured(rawText: string): OCRStructured {
  // 1. Try markdown-wrapped JSON
  const markdownMatch = rawText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (markdownMatch && markdownMatch[1] !== undefined) {
    const parsed = tryParse(markdownMatch[1].trim());
    if (parsed) return parsed;
  }

  // 2. Try bare JSON
  const bareMatch = rawText.match(/^\s*(\{[\s\S]*\})\s*$/);
  if (bareMatch && bareMatch[1] !== undefined) {
    const parsed = tryParse(bareMatch[1]);
    if (parsed) return parsed;
  }

  // 3. Fall back to raw text as a single-field OCRStructured
  return rawTextToFallback(rawText);
}

/**
 * Attempt to parse a string as JSON.
 * Returns null if parsing fails.
 */
function tryParse(text: string): OCRStructured | null {
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      return normalizeStructured(obj as Partial<OCRStructured>);
    }
  } catch {
    // parse failed
  }
  return null;
}

/**
 * Normalize a parsed JSON object into a safe OCRStructured.
 * Handles missing fields and wrong types gracefully.
 */
function normalizeStructured(obj: Partial<OCRStructured>): OCRStructured {
  const rawFields: unknown[] = Array.isArray(obj.fields) ? obj.fields : [];
  const rawSizes: unknown[] = Array.isArray(obj.sizes) ? obj.sizes : [];

  const fields: OCRField[] = [];
  for (const f of rawFields) {
    const norm = normalizeField(f);
    if (norm !== null) fields.push(norm);
  }

  const sizes: OCRSize[] = [];
  for (const s of rawSizes) {
    const norm = normalizeSize(s);
    if (norm !== null) sizes.push(norm);
  }

  return {
    ...(typeof obj.title === "string" ? { title: obj.title } : {}),
    fields,
    sizes,
    ...(typeof obj.rawText === "string" ? { rawText: obj.rawText } : {}),
    notes: Array.isArray(obj.notes) ? obj.notes.filter((n) => typeof n === "string") : [],
  };
}

function normalizeField(f: unknown): OCRField | null {
  if (!f || typeof f !== "object") return null;
  const field = f as Record<string, unknown>;
  if (typeof field.field !== "string" && typeof field.value !== "string") return null;

  const confidence: OCRField["confidence"] =
    field.confidence === "high" || field.confidence === "medium" || field.confidence === "low"
      ? field.confidence
      : undefined;

  const category: OCRField["category"] =
    field.category === "main" || field.category === "other" ? field.category : undefined;

  return {
    field: typeof field.field === "string" ? field.field : "",
    value: typeof field.value === "string" ? field.value : "",
    ...(confidence !== undefined ? { confidence } : {}),
    ...(category !== undefined ? { category } : {}),
  };
}

function normalizeSize(s: unknown): OCRSize | null {
  if (!s || typeof s !== "object") return null;
  const size = s as Record<string, unknown>;
  if (typeof size.size !== "string") return null;
  return {
    size: size.size,
    quantity: typeof size.quantity === "number" ? size.quantity : 0,
  };
}

/**
 * When JSON parsing fails, create a fallback OCRStructured from raw text.
 */
function rawTextToFallback(rawText: string): OCRStructured {
  // Attempt to extract size patterns like "3 XL" or "2xL"
  const sizes: OCRSize[] = [];
  const sizeMatches = rawText.matchAll(/(\d+)\s*(?:x\s*)?([A-Z]{1,3})/gi);
  for (const m of sizeMatches) {
    if (m[1] !== undefined && m[2] !== undefined) {
      sizes.push({ size: m[2].toUpperCase(), quantity: parseInt(m[1], 10) });
    }
  }

  // Use the first non-empty line as title
  const lines = rawText.split("\n").filter((l) => l.trim());
  const title: string | undefined = lines[0];

  return {
    ...(title !== undefined ? { title } : {}),
    fields: [],
    sizes,
    rawText: rawText.slice(0, 1000),
  };
}