/**
 * PATCH /api/users/[id]/role
 * Update a user's role (admin only).
 * Enforces last-admin protection.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/rbac";
import { updateRoleService } from "@/lib/users/service";
import { ok, fail } from "@/lib/api/response";
import { isEnum } from "@/lib/api/validation";
import { toApiError } from "@/lib/api/errors";
import type { UserRole } from "@/types/user";

const ROLE_VALUES = ["admin", "manager", "user"] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface RoleBody {
  role?: unknown;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  let currentUser;
  try {
    currentUser = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  try {
    requireAdmin(currentUser);
  } catch {
    return NextResponse.json(fail("Admin access required", "FORBIDDEN"), { status: 403 });
  }

  let body: RoleBody;
  try {
    body = await req.json() as unknown as RoleBody;
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "VALIDATION_ERROR"), { status: 400 });
  }

  const roleErr = isEnum(body.role, [...ROLE_VALUES]);
  if (roleErr) {
    return NextResponse.json(fail(roleErr, "VALIDATION_ERROR"), { status: 400 });
  }

  const { id } = await params;

  try {
    const updatedUser = await updateRoleService(id, body.role as UserRole);
    return NextResponse.json(ok(updatedUser));
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(fail(apiErr.message, apiErr.code), { status: apiErr.status });
  }
}