/**
 * Test fixtures — scan records.
 * Returns stable mock data for unit and integration tests.
 */

import type { ScanRecord, OCRStructured, TokenUsage } from "@/types/scan";

export const MOCK_TOKEN_USAGE: TokenUsage = {
  input: 1200,
  output: 320,
  cost: 0.00215,
  model: "anthropic/claude-3-haiku",
};

export const MOCK_OCR_STRUCTURED: OCRStructured = {
  title: "Nike Dri-FIT Running Short",
  fields: [
    { field: "brand", value: "Nike", confidence: "high", category: "main" },
    { field: "product type", value: "Shorts", confidence: "high", category: "main" },
    { field: "material", value: "100% Polyester", confidence: "medium", category: "other" },
    { field: "color", value: "Black", confidence: "high", category: "other" },
  ],
  sizes: [
    { size: "S", quantity: 2 },
    { size: "M", quantity: 5 },
    { size: "L", quantity: 3 },
  ],
  rawText: "Nike Dri-FIT Running Short\n100% Polyester\nBlack\nS x2 M x5 L x3",
  notes: [],
};

export function makeScanRecord(overrides: Partial<ScanRecord> = {}): ScanRecord {
  return {
    id: "scan-uuid-001",
    userId: "user-uuid-001",
    userEmail: "user@hlvn.app",
    timestamp: "2026-01-15T10:30:00Z",
    imageUrl: null,
    ocrRaw: "Nike Dri-FIT Running Short\n100% Polyester\nBlack\nS x2 M x5 L x3",
    ocrStructured: MOCK_OCR_STRUCTURED,
    tokenUsage: MOCK_TOKEN_USAGE,
    apiKeyIndex: 1,
    edited: false,
    createdAt: "2026-01-15T10:30:00Z",
    updatedAt: "2026-01-15T10:30:00Z",
    ...overrides,
  };
}

export const SAMPLE_SCAN_RECORDS: ScanRecord[] = [
  makeScanRecord({ id: "scan-uuid-001", userId: "user-uuid-001", timestamp: "2026-01-10T09:00:00Z", apiKeyIndex: 1 }),
  makeScanRecord({ id: "scan-uuid-002", userId: "user-uuid-001", timestamp: "2026-01-11T10:00:00Z", apiKeyIndex: 1 }),
  makeScanRecord({ id: "scan-uuid-003", userId: "admin-uuid-001", timestamp: "2026-01-12T11:00:00Z", apiKeyIndex: 2 }),
  makeScanRecord({ id: "scan-uuid-004", userId: "admin-uuid-001", timestamp: "2026-01-13T12:00:00Z", apiKeyIndex: 1 }),
  makeScanRecord({ id: "scan-uuid-005", userId: "manager-uuid-001", timestamp: "2026-01-14T13:00:00Z", apiKeyIndex: 2 }),
];
