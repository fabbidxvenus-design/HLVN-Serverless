/**
 * ScanRecord and related OCR types.
 * ocrStructured and tokenUsage are stored as JSONB in PostgreSQL.
 * Matches BUILDER-HANDOFF.md exactly.
 */

export interface OCRField {
  field: string;
  value: string;
  confidence?: "high" | "medium" | "low";
  category?: "main" | "other";
}

export interface OCRSize {
  size: string;
  quantity: number;
}

export interface OCRStructured {
  title?: string;
  fields: OCRField[];
  sizes: OCRSize[];
  rawText?: string;
  notes?: string[];
}

export interface TokenUsage {
  input: number;
  output: number;
  cost: number;
  model?: string;
}

export interface ScanRecord {
  id: string;
  userId: string;
  userEmail?: string;
  timestamp: string;
  imageUrl: string | null;
  ocrRaw: string;
  ocrStructured: OCRStructured;
  tokenUsage: TokenUsage;
  apiKeyIndex: number;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
}