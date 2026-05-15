/**
 * Integration: scan boundary tests.
 * Tests that non-admin users are scoped to their own scans.
 */

import { describe, it, expect, vi } from "vitest";
import { ForbiddenError } from "@/lib/api/errors";
import { ADMIN_USER, MANAGER_USER, REGULAR_USER } from "tests/fixtures/users";
import { SAMPLE_SCAN_RECORDS } from "tests/fixtures/scans";
import type { ScanRecord } from "@/types/scan";

// ── Mock repository so tests run without a real DB ─────────────────────────
vi.mock("@/lib/scans/repository", () => ({
  listScans: vi.fn(),
  getScanById: vi.fn(),
  createScan: vi.fn(),
  updateScan: vi.fn(),
  deleteScan: vi.fn(),
  getStoragePathsForUser: vi.fn(),
}));

vi.mock("@/lib/supabase/storage", () => ({
  deleteStorageObject: vi.fn(),
  generateReadUrl: vi.fn(async (storagePath: string) => `https://signed.example/${encodeURIComponent(storagePath)}`),
}));

import * as repo from "@/lib/scans/repository";
import { listScansService, getScanService, createScanService } from "@/lib/scans/service";
import type { PaginatedScans } from "@/lib/scans/service";

function makePaginated(scans: ScanRecord[]): PaginatedScans {
  return { scans, total: scans.length, hasMore: false };
}

describe("scan-boundaries — listScansService", () => {
  it("admin can list without userId filter", async () => {
    vi.mocked(repo.listScans).mockResolvedValueOnce(makePaginated(SAMPLE_SCAN_RECORDS));

    const result = await listScansService({}, ADMIN_USER.id, ADMIN_USER.role);
    expect(repo.listScans).toHaveBeenCalledWith({});
  });

  it("non-admin has userId forced to their own id", async () => {
    vi.mocked(repo.listScans).mockResolvedValueOnce(makePaginated([]));

    await listScansService({}, REGULAR_USER.id, REGULAR_USER.role);
    expect(repo.listScans).toHaveBeenCalledWith({ userId: REGULAR_USER.id });
  });

  it("manager has userId forced to their own id", async () => {
    vi.mocked(repo.listScans).mockResolvedValueOnce(makePaginated([]));

    await listScansService({}, MANAGER_USER.id, MANAGER_USER.role);
    expect(repo.listScans).toHaveBeenCalledWith({ userId: MANAGER_USER.id });
  });
});

describe("scan-boundaries — getScanService", () => {
  it("admin can access any scan", async () => {
    const scan = SAMPLE_SCAN_RECORDS[0];
    if (!scan) throw new Error("fixture missing");
    vi.mocked(repo.getScanById).mockResolvedValueOnce(scan);

    const result = await getScanService(scan.id, ADMIN_USER.id, ADMIN_USER.role);
    expect(result.id).toBe(scan.id);
  });

  it("owner can access their own scan", async () => {
    const first = SAMPLE_SCAN_RECORDS[0];
    if (!first) throw new Error("fixture missing");
    const scan = { ...first, userId: REGULAR_USER.id };
    vi.mocked(repo.getScanById).mockResolvedValueOnce(scan);

    const result = await getScanService(scan.id, REGULAR_USER.id, REGULAR_USER.role);
    expect(result.id).toBe(scan.id);
  });

  it("non-owner is blocked from foreign scan", async () => {
    const first = SAMPLE_SCAN_RECORDS[0];
    if (!first) throw new Error("fixture missing");
    const scan = { ...first, userId: ADMIN_USER.id };
    vi.mocked(repo.getScanById).mockResolvedValueOnce(scan);

    await expect(
      getScanService(scan.id, REGULAR_USER.id, REGULAR_USER.role),
    ).rejects.toThrow(ForbiddenError);
  });

  it("manager is blocked from foreign scan", async () => {
    const first = SAMPLE_SCAN_RECORDS[0];
    if (!first) throw new Error("fixture missing");
    const scan = { ...first, userId: ADMIN_USER.id };
    vi.mocked(repo.getScanById).mockResolvedValueOnce(scan);

    await expect(
      getScanService(scan.id, MANAGER_USER.id, MANAGER_USER.role),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("scan-boundaries — createScanService imageUrl ownership", () => {
  const basePayload = {
    ocrRaw: "raw",
    ocrStructured: { fields: [], sizes: [] },
    tokenUsage: { input: 1, output: 1, cost: 0.001 },
    apiKeyIndex: 0,
  };

  it("accepts owned storage path", async () => {
    const created = {
      ...(SAMPLE_SCAN_RECORDS[0] as ScanRecord),
      id: "scan-new-owned",
      userId: REGULAR_USER.id,
      imageUrl: `scans/${REGULAR_USER.id}/thumb.jpg`,
      ocrRaw: basePayload.ocrRaw,
      ocrStructured: basePayload.ocrStructured,
      tokenUsage: basePayload.tokenUsage,
      apiKeyIndex: basePayload.apiKeyIndex,
      edited: false,
      timestamp: "2026-05-15T12:00:00.000Z",
      createdAt: "2026-05-15T12:00:00.000Z",
      updatedAt: "2026-05-15T12:00:00.000Z",
    };
    vi.mocked(repo.createScan).mockResolvedValueOnce(created);

    const result = await createScanService(REGULAR_USER.id, {
      ...basePayload,
      imageUrl: `scans/${REGULAR_USER.id}/thumb.jpg`,
    });

    expect(result.imageUrl).toBeDefined();
    expect(repo.createScan).toHaveBeenCalledWith(
      REGULAR_USER.id,
      expect.objectContaining({ imageUrl: `scans/${REGULAR_USER.id}/thumb.jpg` }),
    );
  });

  it("rejects storage path that belongs to another user", async () => {
    await expect(
      createScanService(REGULAR_USER.id, {
        ...basePayload,
        imageUrl: `scans/${ADMIN_USER.id}/thumb.jpg`,
      }),
    ).rejects.toThrow("imageUrl must belong to the requesting user");
  });

  it("rejects traversal-like storage path", async () => {
    await expect(
      createScanService(REGULAR_USER.id, {
        ...basePayload,
        imageUrl: `scans/${REGULAR_USER.id}/../../${ADMIN_USER.id}/thumb.jpg`,
      }),
    ).rejects.toThrow("imageUrl must be a storage path matching scans/<userId>/<file>");
  });
});

