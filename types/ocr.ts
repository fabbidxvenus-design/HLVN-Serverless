/**
 * OCR request/response types.
 * These wrap OpenRouter responses and map to our internal ScanRecord shape.
 */

import type { OCRStructured, TokenUsage } from "./scan";

/** Model tier selection for OCR processing. */
export type OCRModelTier = "free" | "default" | "high";

/** Request body for POST /api/ocr/process. */
export interface OCRProcessRequest {
  imageBase64?: string;
  imageUrl?: string;
  modelTier?: OCRModelTier;
}

/** Response from POST /api/ocr/process. */
export interface OCRProcessResponse {
  ocrRaw: string;
  ocrStructured: OCRStructured;
  tokenUsage: TokenUsage;
  apiKeyIndex: number;
  model: string;
}