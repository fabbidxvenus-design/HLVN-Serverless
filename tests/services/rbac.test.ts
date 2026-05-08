import { describe, it, expect } from "vitest";
import {
  ROLE_PERMISSIONS,
  hasPermission,
  requireAdmin,
  requireRole,
  requireDashboardAccess,
  type RolePermissions,
} from "@/lib/auth/rbac";
import type { UserProfile } from "@/types/user";
import { ForbiddenError } from "@/lib/api/errors";

function makeUser(role: UserProfile["role"]): UserProfile {
  return {
    id: "test-user-id",
    email: "test@example.com",
    role,
    createdAt: "2026-01-01T00:00:00Z",
    lastLogin: null,
  };
}

describe("ROLE_PERMISSIONS", () => {
  it("admin has all permissions including dashboard", () => {
    const p: RolePermissions = ROLE_PERMISSIONS["admin"];
    expect(p.canAccessDashboard).toBe(true);
    expect(p.canManageUsers).toBe(true);
    expect(p.canViewAllHistory).toBe(true);
    expect(p.canViewAnalytics).toBe(true);
    expect(p.canScanOCR).toBe(true);
  });

  it("manager and user are denied dashboard access", () => {
    expect(ROLE_PERMISSIONS["manager"].canAccessDashboard).toBe(false);
    expect(ROLE_PERMISSIONS["user"].canAccessDashboard).toBe(false);
  });

  it("manager and user have mobile permissions", () => {
    expect(ROLE_PERMISSIONS["manager"].canScanOCR).toBe(true);
    expect(ROLE_PERMISSIONS["manager"].canViewOwnHistory).toBe(true);
    expect(ROLE_PERMISSIONS["user"].canScanOCR).toBe(true);
    expect(ROLE_PERMISSIONS["user"].canViewOwnHistory).toBe(true);
  });

  it("manager and user cannot manage users or view analytics", () => {
    expect(ROLE_PERMISSIONS["manager"].canManageUsers).toBe(false);
    expect(ROLE_PERMISSIONS["manager"].canViewAnalytics).toBe(false);
    expect(ROLE_PERMISSIONS["user"].canManageUsers).toBe(false);
    expect(ROLE_PERMISSIONS["user"].canViewAnalytics).toBe(false);
  });
});

describe("hasPermission", () => {
  it("returns true when role has permission", () => {
    expect(hasPermission("admin", "canAccessDashboard")).toBe(true);
    expect(hasPermission("user", "canScanOCR")).toBe(true);
  });

  it("returns false when role lacks permission", () => {
    expect(hasPermission("user", "canAccessDashboard")).toBe(false);
    expect(hasPermission("manager", "canManageUsers")).toBe(false);
  });

  it("returns false for unknown permission key", () => {
    expect(hasPermission("admin", "canDoSomething" as keyof RolePermissions)).toBe(false);
  });
});

describe("requireAdmin", () => {
  it("does not throw for admin user", () => {
    expect(() => requireAdmin(makeUser("admin"))).not.toThrow();
  });

  it("throws ForbiddenError for non-admin user", () => {
    expect(() => requireAdmin(makeUser("user"))).toThrow(ForbiddenError);
    expect(() => requireAdmin(makeUser("manager"))).toThrow(ForbiddenError);
  });

  it("error message mentions admin requirement", () => {
    try {
      requireAdmin(makeUser("user"));
    } catch (e) {
      expect((e as ForbiddenError).message).toContain("Admin");
    }
  });
});

describe("requireRole", () => {
  it("does not throw when user role is in allowed list", () => {
    expect(() => requireRole(makeUser("admin"), ["admin", "manager"])).not.toThrow();
    expect(() => requireRole(makeUser("manager"), ["admin", "manager"])).not.toThrow();
    expect(() => requireRole(makeUser("user"), ["admin", "manager", "user"])).not.toThrow();
  });

  it("throws ForbiddenError when user role is not in allowed list", () => {
    expect(() => requireRole(makeUser("user"), ["admin"])).toThrow(ForbiddenError);
  });

  it("default role list allows all three roles", () => {
    expect(() => requireRole(makeUser("admin"))).not.toThrow();
    expect(() => requireRole(makeUser("manager"))).not.toThrow();
    expect(() => requireRole(makeUser("user"))).not.toThrow();
  });
});

describe("requireDashboardAccess", () => {
  it("does not throw for admin user", () => {
    expect(() => requireDashboardAccess(makeUser("admin"))).not.toThrow();
  });

  it("throws ForbiddenError for manager and user", () => {
    expect(() => requireDashboardAccess(makeUser("manager"))).toThrow(ForbiddenError);
    expect(() => requireDashboardAccess(makeUser("user"))).toThrow(ForbiddenError);
  });

  it("error message guides user to mobile app", () => {
    try {
      requireDashboardAccess(makeUser("user"));
    } catch (e) {
      expect((e as ForbiddenError).message).toContain("mobile");
    }
  });
});