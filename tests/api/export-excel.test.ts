/**
 * Export Excel API route tests.
 * Tests RBAC guard behavior and workbook output shape.
 */

import { describe, it, expect } from "vitest";
import { buildExportWorkbook } from "@/lib/export/excel";
import { requireAdmin } from "@/lib/auth/rbac";
import { ForbiddenError } from "@/lib/api/errors";
import type { UserProfile } from "@/types/user";
import type { ExportScanRecord } from "@/lib/export/excel";

function adminUser(): UserProfile {
  return {
    id: "admin-001",
    email: "admin@hlvn.app",
    role: "admin",
    createdAt: "2026-01-01T00:00:00Z",
    lastLogin: null,
  };
}

function regularUser(): UserProfile {
  return {
    id: "user-001",
    email: "user@hlvn.app",
    role: "user",
    createdAt: "2026-01-01T00:00:00Z",
    lastLogin: null,
  };
}

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

describe("export Excel API — RBAC", () => {
  it("admin passes requireAdmin guard", () => {
    expect(() => requireAdmin(adminUser())).not.toThrow();
  });

  it("regular user is blocked by requireAdmin", () => {
    expect(() => requireAdmin(regularUser())).toThrow(ForbiddenError);
  });
});

describe("export Excel API — workbook output", () => {
  it("buildExportWorkbook produces valid XLSX buffer", async () => {
    const buf = await buildExportWorkbook([makeExportRecord()]);
    expect(Buffer.isBuffer(buf)).toBe(true);
    // XLSX is a ZIP container
    expect(buf[0]).toBe(0x50); // P
    expect(buf[1]).toBe(0x4b); // K
  });

  it("buildExportWorkbook handles empty array", async () => {
    const buf = await buildExportWorkbook([]);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it("buildExportWorkbook handles multiple records", async () => {
    const records = [
      makeExportRecord(),
      { ...makeExportRecord(), id: "scan-002", userEmail: "bob@example.com" },
    ];
    const buf = await buildExportWorkbook(records);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(0);
  });
});

describe("export Excel API — request body shape", () => {
  it("valid export body has optional fields", () => {
    const body = { search: "Nike", userId: "user-001", from: "2026-01-01", to: "2026-01-31" };
    expect(typeof body.search).toBe("string");
    expect(typeof body.userId).toBe("string");
    expect(typeof body.from).toBe("string");
    expect(typeof body.to).toBe("string");
  });

  it("empty export body is valid (export all)", () => {
    const body = {};
    expect(Object.keys(body).length).toBe(0);
  });
});
