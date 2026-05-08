/**
 * RBAC helpers — role permissions and require-XXX guards.
 *
 * Rules:
 *   - Dashboard access is admin-only.
 *   - Mobile operations allow all authenticated roles.
 *   - RBAC is enforced at service layer even when RLS provides DB-level enforcement.
 */

import type { UserRole } from "@/types/user";
import type { UserProfile } from "@/types/user";
import { ForbiddenError } from "@/lib/api/errors";

/** Full permission map. Extensible without breaking existing callers. */
export interface RolePermissions {
  // Mobile app
  canScanOCR: boolean;
  canViewOwnHistory: boolean;
  canExportOwnData: boolean;
  canEditOwnScans: boolean;
  // Dashboard (admin-only)
  canAccessDashboard: boolean;
  canManageUsers: boolean;
  canViewAllHistory: boolean;
  canExportAllData: boolean;
  canManageAPIKeys: boolean;
  canViewAnalytics: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canScanOCR: true,
    canViewOwnHistory: true,
    canExportOwnData: true,
    canEditOwnScans: true,
    canAccessDashboard: true,
    canManageUsers: true,
    canViewAllHistory: true,
    canExportAllData: true,
    canManageAPIKeys: true,
    canViewAnalytics: true,
  },
  manager: {
    canScanOCR: true,
    canViewOwnHistory: true,
    canExportOwnData: true,
    canEditOwnScans: true,
    canAccessDashboard: false,
    canManageUsers: false,
    canViewAllHistory: false,
    canExportAllData: false,
    canManageAPIKeys: false,
    canViewAnalytics: false,
  },
  user: {
    canScanOCR: true,
    canViewOwnHistory: true,
    canExportOwnData: true,
    canEditOwnScans: true,
    canAccessDashboard: false,
    canManageUsers: false,
    canViewAllHistory: false,
    canExportAllData: false,
    canManageAPIKeys: false,
    canViewAnalytics: false,
  },
};

/**
 * Check whether a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

/** Throw ForbiddenError if the current user is not an admin. */
export function requireAdmin(user: UserProfile): void {
  if (user.role !== "admin") {
    throw new ForbiddenError("Admin access required");
  }
}

/**
 * Throw ForbiddenError if the current user does not have one of the allowed roles.
 * @param user   The authenticated user.
 * @param roles  Allowed roles (defaults to all three: admin, manager, user).
 */
export function requireRole(
  user: UserProfile,
  roles: UserRole[] = ["admin", "manager", "user"],
): void {
  if (!roles.includes(user.role)) {
    throw new ForbiddenError(`Requires one of: ${roles.join(", ")}`);
  }
}

/**
 * Check whether the current user can access the dashboard.
 * Throws ForbiddenError for manager/user roles.
 */
export function requireDashboardAccess(user: UserProfile): void {
  if (!hasPermission(user.role, "canAccessDashboard")) {
    throw new ForbiddenError(
      "Dashboard access is restricted to administrators. Please use the mobile app.",
    );
  }
}