import { describe, it, expect, vi } from "vitest";
import { buildExportWorkbook, type ExportScanRecord } from "@/lib/export/excel";

// Mock fetch (used in buildExportWorkbook for image embedding)
const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

function makeRecord(overrides: Partial<ExportScanRecord> = {}): ExportScanRecord {
  return {
    id: "scan-001",
    userId: "user-001",
    userEmail: "alice@example.com",
    timestamp: "2026-01-15T10:30:00Z",
    imageUrl: null,
    ocrRaw: "Nike Dri-FIT Running Short\n100% Polyester\nS x2 M x5 L x3",
    ocrStructured: {
      title: "Nike Dri-FIT Running Short",
      fields: [
        { field: "brand", value: "Nike", confidence: "high", category: "main" },
        { field: "product type", value: "Shorts", confidence: "high", category: "main" },
        { field: "material", value: "100% Polyester", confidence: "medium", category: "other" },
      ],
      sizes: [
        { size: "S", quantity: 2 },
        { size: "M", quantity: 5 },
        { size: "L", quantity: 3 },
      ],
      rawText: "Nike Dri-FIT Running Short",
    },
    tokenUsage: { input: 1200, output: 320, cost: 0.00215, model: "test" },
    apiKeyIndex: 1,
    ...overrides,
  };
}

describe("buildExportWorkbook", () => {
  it("generates a valid XLSX buffer", async () => {
    const buf = await buildExportWorkbook([makeRecord()]);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it("produces a buffer with XLSX magic bytes", async () => {
    const buf = await buildExportWorkbook([makeRecord()]);
    // PK zip signature (XLSX is a zip file)
    expect(buf[0]).toBe(0x50); // P
    expect(buf[1]).toBe(0x4b); // K
  });

  it("handles multiple records", async () => {
    const records = [
      makeRecord({ id: "scan-001" }),
      makeRecord({ id: "scan-002", userEmail: "bob@example.com" }),
      makeRecord({ id: "scan-003", userEmail: "carol@example.com" }),
    ];
    const buf = await buildExportWorkbook(records);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it("handles records with no imageUrl", async () => {
    const record = makeRecord({ imageUrl: null });
    const buf = await buildExportWorkbook([record]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it("handles records with sizes array", async () => {
    const record = makeRecord();
    const buf = await buildExportWorkbook([record]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it("handles empty ocrStructured sizes", async () => {
    const record = makeRecord({
      ocrStructured: {
        title: "Test Item",
        fields: [],
        sizes: [],
        rawText: "raw",
      },
    });
    const buf = await buildExportWorkbook([record]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it("handles empty records array", async () => {
    const buf = await buildExportWorkbook([]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it("handles imageUrl with failed fetch (graceful degradation)", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });

    const record = makeRecord({ imageUrl: "https://example.com/image.jpg" });
    const buf = await buildExportWorkbook([record]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it("handles imageUrl with network error (graceful degradation)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const record = makeRecord({ imageUrl: "https://example.com/image.jpg" });
    const buf = await buildExportWorkbook([record]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it("handles missing tokenUsage fields gracefully", async () => {
    const record = makeRecord({
      tokenUsage: { input: 0, output: 0, cost: 0 } as ExportScanRecord["tokenUsage"],
    });
    const buf = await buildExportWorkbook([record]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it("handles ocrStructured with no title", async () => {
    const record = makeRecord({
      ocrStructured: {
        title: "",
        fields: [],
        sizes: [],
        rawText: "raw",
      },
    });
    const buf = await buildExportWorkbook([record]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });
});
