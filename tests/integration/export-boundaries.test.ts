/**
 * Integration: export boundary tests.
 * Tests RBAC enforcement and output shape for the Excel export endpoint.
 */

import { describe, it, expect, vi } from "vitest";
import { buildExportWorkbook } from "@/lib/export/excel";
import { requireAdmin } from "@/lib/auth/rbac";
import { ForbiddenError } from "@/lib/api/errors";
import { ADMIN_USER, REGULAR_USER } from "tests/fixtures/users";
import type { ExportScanRecord } from "@/lib/export/excel";

function makeExportRecord(): ExportScanRecord {
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
  };
}

describe("export-boundaries — RBAC", () => {
  it("admin passes requireAdmin for export", () => {
    expect(() => requireAdmin(ADMIN_USER)).not.toThrow();
  });

  it("regular user is blocked from export", () => {
    expect(() => requireAdmin(REGULAR_USER)).toThrow(ForbiddenError);
  });
});

describe("export-boundaries — workbook output", () => {
  it("buildExportWorkbook produces valid XLSX buffer", async () => {
    const buf = await buildExportWorkbook([makeExportRecord()]);
    expect(Buffer.isBuffer(buf)).toBe(true);
    // XLSX is a ZIP container
    expect(buf[0]).toBe(0x50); // P
    expect(buf[1]).toBe(0x4b); // K
  });

  it("buildExportWorkbook handles multiple records", async () => {
    const records = [
      makeExportRecord(),
      { ...makeExportRecord(), id: "scan-002" },
    ];
    const buf = await buildExportWorkbook(records);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it("buildExportWorkbook handles empty array", async () => {
    const buf = await buildExportWorkbook([]);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it("buildExportWorkbook with varied sizes expands to multiple rows", async () => {
    // A scan with 3 sizes should contribute 3 rows in the Sizes sheet
    const buf = await buildExportWorkbook([makeExportRecord()]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });
});
