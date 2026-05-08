/**
 * Integration: scan boundary tests.
 * Tests that non-admin users are scoped to their own scans.
 */

import { describe, it, expect, vi } from "vitest";
import * as scansService from "@/lib/scans/service";
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
}));

import * as repo from "@/lib/scans/repository";
import { listScansService, getScanService } from "@/lib/scans/service";
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
