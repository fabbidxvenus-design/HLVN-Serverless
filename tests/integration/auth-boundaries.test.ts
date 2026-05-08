/**
 * Integration: auth boundary tests.
 * Tests RBAC enforcement at the service layer without a real Supabase connection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAdmin, requireRole, hasPermission } from "@/lib/auth/rbac";
import type { UserProfile } from "@/types/user";
import { ForbiddenError } from "@/lib/api/errors";
import { ADMIN_USER, MANAGER_USER, REGULAR_USER } from "tests/fixtures/users";

beforeEach(() => vi.clearAllMocks());

describe("auth-boundaries — requireAdmin", () => {
  it("admin passes requireAdmin", () => {
    expect(() => requireAdmin(ADMIN_USER)).not.toThrow();
  });

  it("manager is blocked", () => {
    expect(() => requireAdmin(MANAGER_USER)).toThrow(ForbiddenError);
  });

  it("user is blocked", () => {
    expect(() => requireAdmin(REGULAR_USER)).toThrow(ForbiddenError);
  });

  it("error message says 'Admin'", () => {
    try {
      requireAdmin(REGULAR_USER);
    } catch (e) {
      expect((e as ForbiddenError).message).toContain("Admin");
    }
  });
});

describe("auth-boundaries — requireRole", () => {
  it("manager passes role check for manager", () => {
    expect(() => requireRole(MANAGER_USER, ["manager", "admin"])).not.toThrow();
  });

  it("user is blocked from admin-only routes", () => {
    expect(() => requireRole(REGULAR_USER, ["admin"])).toThrow(ForbiddenError);
  });

  it("default role list allows all three roles", () => {
    expect(() => requireRole(ADMIN_USER)).not.toThrow();
    expect(() => requireRole(MANAGER_USER)).not.toThrow();
    expect(() => requireRole(REGULAR_USER)).not.toThrow();
  });
});

describe("auth-boundaries — hasPermission", () => {
  it("admin has canViewAnalytics", () => {
    expect(hasPermission("admin", "canViewAnalytics")).toBe(true);
  });

  it("manager does not have canViewAnalytics", () => {
    expect(hasPermission("manager", "canViewAnalytics")).toBe(false);
  });

  it("user does not have canViewAnalytics", () => {
    expect(hasPermission("user", "canViewAnalytics")).toBe(false);
  });

  it("admin has canExportAllData", () => {
    expect(hasPermission("admin", "canExportAllData")).toBe(true);
  });

  it("manager does not have canExportAllData", () => {
    expect(hasPermission("manager", "canExportAllData")).toBe(false);
  });
});
