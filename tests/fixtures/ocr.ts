/**
 * Test fixtures — OCR structures.
 * Returns stable mock OCR data for unit and integration tests.
 */

import type { OCRStructured, OCRField, OCRSize } from "@/types/scan";

export const SAMPLE_FIELDS: OCRField[] = [
  { field: "brand", value: "Nike", confidence: "high", category: "main" },
  { field: "product type", value: "T-Shirt", confidence: "high", category: "main" },
  { field: "material", value: "Cotton", confidence: "medium", category: "other" },
  { field: "color", value: "White", confidence: "high", category: "other" },
  { field: "country", value: "Vietnam", confidence: "medium", category: "other" },
];

export const SAMPLE_SIZES: OCRSize[] = [
  { size: "XS", quantity: 1 },
  { size: "S", quantity: 3 },
  { size: "M", quantity: 6 },
  { size: "L", quantity: 4 },
  { size: "XL", quantity: 2 },
];

export const SAMPLE_OCR_STRUCTURED: OCRStructured = {
  title: "Nike Sportswear Essential",
  fields: SAMPLE_FIELDS,
  sizes: SAMPLE_SIZES,
  rawText: "Nike Sportswear Essential\nCotton\nWhite\nMade in Vietnam\nXS x1 S x3 M x6 L x4 XL x2",
  notes: [],
};

export function makeOcrStructured(overrides: Partial<OCRStructured> = {}): OCRStructured {
  return { ...SAMPLE_OCR_STRUCTURED, ...overrides };
}
