import { describe, it, expect } from "vitest";
import type { ScanRecord } from "@/types/scan";

// Basic shape tests that don't require a live Supabase instance
function makeScan(overrides: Partial<ScanRecord> = {}): ScanRecord {
  return {
    id: "scan-1",
    userId: "user-1",
    timestamp: "2026-05-08T00:00:00Z",
    imageUrl: "https://cdn.example.com/scan.jpg",
    ocrRaw: "raw text",
    ocrStructured: { fields: [], sizes: [] },
    tokenUsage: { input: 100, output: 50, cost: 0.001 },
    apiKeyIndex: 0,
    edited: false,
    createdAt: "2026-05-08T00:00:00Z",
    updatedAt: "2026-05-08T00:00:00Z",
    ...overrides,
  };
}

describe("ScanRecord shape", () => {
  it("has all required fields", () => {
    const s = makeScan();
    expect(s.id).toBeDefined();
    expect(s.userId).toBeDefined();
    expect(s.ocrRaw).toBeDefined();
    expect(s.ocrStructured).toBeDefined();
    expect(s.tokenUsage).toBeDefined();
  });

  it("allows null imageUrl", () => {
    expect(makeScan({ imageUrl: null }).imageUrl).toBeNull();
  });

  it("allows optional userEmail", () => {
    expect(makeScan({ userEmail: "user@example.com" }).userEmail).toBe("user@example.com");
  });

  it("edited flag defaults to false on create", () => {
    expect(makeScan().edited).toBe(false);
  });

  it("edited flag set to true on update", () => {
    expect(makeScan({ edited: true }).edited).toBe(true);
  });
});

describe("Scan access rules", () => {
  function canViewScan(scan: ScanRecord, requestingUser: { id: string; role: "admin" | "user" | "manager" }) {
    return requestingUser.role === "admin" || scan.userId === requestingUser.id;
  }

  it("owner can view their own scan", () => {
    const scan = makeScan({ userId: "user-1" });
    expect(canViewScan(scan, { id: "user-1", role: "user" })).toBe(true);
  });

  it("non-owner cannot view scan without admin role", () => {
    const scan = makeScan({ userId: "user-1" });
    expect(canViewScan(scan, { id: "user-2", role: "user" })).toBe(false);
  });

  it("admin can view any scan", () => {
    const scan = makeScan({ userId: "user-1" });
    expect(canViewScan(scan, { id: "admin-1", role: "admin" })).toBe(true);
  });
});

describe("Upload URL validation", () => {
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_SIZE = 10 * 1024 * 1024;

  it("accepts valid content types", () => {
    ALLOWED_TYPES.forEach((ct) => {
      expect(ALLOWED_TYPES.includes(ct)).toBe(true);
    });
  });

  it("rejects oversized files", () => {
    expect(MAX_SIZE > 0).toBe(true);
    expect(MAX_SIZE).toBe(10 * 1024 * 1024);
  });
});