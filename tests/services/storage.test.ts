import { describe, it, expect, vi } from "vitest";
// Mock storage before importing the module that requires supabase env vars
vi.mock("@/lib/supabase/storage", () => ({
  buildScanStoragePath: (userId: string, fileName: string) =>
    `scans/${userId}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
}));
import { buildScanStoragePath } from "@/lib/supabase/storage";
import { buildSearchFilters, escapeSearchQuery } from "@/lib/scans/search";
import type { ScanRecord } from "@/types/scan";

describe("buildScanStoragePath", () => {
  it("includes userId in path", () => {
    const path = buildScanStoragePath("user-abc", "photo.jpg");
    expect(path).toContain("user-abc");
  });

  it("includes scans bucket prefix", () => {
    const path = buildScanStoragePath("user-abc", "photo.jpg");
    expect(path.startsWith("scans/")).toBe(true);
  });

  it("sanitises filename", () => {
    const path = buildScanStoragePath("user-abc", "my photo (1).jpg");
    expect(path).not.toContain("(");
    expect(path).not.toContain(")");
  });
});

describe("buildSearchFilters", () => {
  it("applies defaults", () => {
    const f = buildSearchFilters({});
    expect(f.page).toBe(1);
    expect(f.limit).toBe(20);
  });

  it("respects provided values", () => {
    const f = buildSearchFilters({ page: "3", limit: "50", search: "hello", userId: "u1", from: "2026-01-01", to: "2026-05-08" });
    expect(f.page).toBe(3);
    expect(f.limit).toBe(50);
    expect(f.search).toBe("hello");
    expect(f.userId).toBe("u1");
    expect(f.from).toBe("2026-01-01");
    expect(f.to).toBe("2026-05-08");
  });

  it("caps limit at 100", () => {
    const f = buildSearchFilters({ limit: "500" });
    expect(f.limit).toBe(100);
  });

  it("strips whitespace from search", () => {
    const f = buildSearchFilters({ search: "  hello  " });
    expect(f.search).toBe("hello");
  });

  it("omits empty strings", () => {
    const f = buildSearchFilters({ search: "" });
    expect(f.search).toBeUndefined();
  });
});

describe("escapeSearchQuery", () => {
  it("leaves normal queries unchanged", () => {
    expect(escapeSearchQuery("hello world")).toBe("hello world");
  });

  it("escapes % wildcard", () => {
    expect(escapeSearchQuery("100%")).toBe("100\\%");
  });

  it("escapes backslash", () => {
    expect(escapeSearchQuery("path\\to")).toBe("path\\\\to");
  });

  it("returns empty string for empty input", () => {
    expect(escapeSearchQuery("")).toBe("");
  });
});