import { describe, it, expect } from "vitest";

// Import the types to verify they compile and match the expected shape
import type {
  OCRStructured,
  OCRField,
  OCRSize,
  TokenUsage,
  ScanRecord,
} from "@/types/scan";

describe("OCRField", () => {
  it("has required field + value", () => {
    const field: OCRField = { field: "author", value: "John Doe" };
    expect(field.field).toBe("author");
    expect(field.value).toBe("John Doe");
  });

  it("accepts optional confidence and category", () => {
    const field: OCRField = {
      field: "size",
      value: "M",
      confidence: "high",
      category: "main",
    };
    expect(field.confidence).toBe("high");
    expect(field.category).toBe("main");
  });
});

describe("OCRSize", () => {
  it("has size and quantity", () => {
    const size: OCRSize = { size: "XL", quantity: 2 };
    expect(size.size).toBe("XL");
    expect(size.quantity).toBe(2);
  });
});

describe("OCRStructured", () => {
  it("has fields and sizes arrays", () => {
    const doc: OCRStructured = {
      title: "Test Document",
      fields: [{ field: "title", value: "My Title" }],
      sizes: [{ size: "M", quantity: 1 }],
    };
    expect(doc.fields).toHaveLength(1);
    expect(doc.sizes).toHaveLength(1);
  });

  it("allows optional rawText and notes", () => {
    const doc: OCRStructured = {
      fields: [],
      sizes: [],
      rawText: "raw ocr text",
      notes: ["note 1", "note 2"],
    };
    expect(doc.rawText).toBe("raw ocr text");
    expect(doc.notes).toEqual(["note 1", "note 2"]);
  });
});

describe("TokenUsage", () => {
  it("has input, output, and cost", () => {
    const usage: TokenUsage = { input: 100, output: 50, cost: 0.001 };
    expect(usage.input).toBe(100);
    expect(usage.output).toBe(50);
    expect(usage.cost).toBeCloseTo(0.001);
  });
});

describe("ScanRecord shape", () => {
  it("has all required fields", () => {
    const record: ScanRecord = {
      id: "scan-1",
      userId: "user-1",
      timestamp: "2026-05-08T00:00:00Z",
      imageUrl: "https://cdn.example.com/scan.jpg",
      ocrRaw: "raw text",
      ocrStructured: { fields: [], sizes: [] },
      tokenUsage: { input: 0, output: 0, cost: 0 },
      apiKeyIndex: 0,
      edited: false,
      createdAt: "2026-05-08T00:00:00Z",
      updatedAt: "2026-05-08T00:00:00Z",
    };
    expect(record.id).toBeDefined();
    expect(record.userId).toBeDefined();
    expect(record.edited).toBe(false);
  });

  it("allows null imageUrl", () => {
    const record: ScanRecord = {
      id: "scan-1",
      userId: "user-1",
      timestamp: "2026-05-08T00:00:00Z",
      imageUrl: null,
      ocrRaw: "raw",
      ocrStructured: { fields: [], sizes: [] },
      tokenUsage: { input: 0, output: 0, cost: 0 },
      apiKeyIndex: 0,
      edited: false,
      createdAt: "2026-05-08T00:00:00Z",
      updatedAt: "2026-05-08T00:00:00Z",
    };
    expect(record.imageUrl).toBeNull();
  });
});