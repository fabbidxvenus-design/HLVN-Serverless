/**
 * GET  /api/users — list users (admin only)
 * POST /api/users — create user (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/rbac";
import { listUsersService, createUserService } from "@/lib/users/service";
import { ok, fail } from "@/lib/api/response";
import { isEmail, isRequiredString, isEnum } from "@/lib/api/validation";
import { toApiError } from "@/lib/api/errors";
import type { UserRole } from "@/types/user";

const ROLE_VALUES = ["admin", "manager", "user"] as const;

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  try {
    requireAdmin(user);
  } catch {
    return NextResponse.json(fail("Admin access required", "FORBIDDEN"), { status: 403 });
  }

  const url = new URL(req.url);
  const rawPage = url.searchParams.get("page");
  const rawLimit = url.searchParams.get("limit");
  const rawSearch = url.searchParams.get("search");
  const rawRole = url.searchParams.get("role") as UserRole | null;

  const page = parseInt(rawPage ?? "1", 10);
  const limit = parseInt(rawLimit ?? "20", 10);

  if (isNaN(page) || page < 1) {
    return NextResponse.json(fail("page must be >= 1", "VALIDATION_ERROR"), { status: 400 });
  }
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return NextResponse.json(fail("limit must be 1-100", "VALIDATION_ERROR"), { status: 400 });
  }

  // Role validation: only admin/manager/user are valid
  const role: UserRole | undefined =
    rawRole !== null && ROLE_VALUES.includes(rawRole as UserRole) ? rawRole : undefined;

  // Build service filters — omit undefined entries so TypeScript is happy
  const filters: { page: number; limit: number; search?: string; role?: UserRole } = { page, limit };
  if (rawSearch !== null) filters.search = rawSearch;
  if (role !== undefined) filters.role = role;

  try {
    const result = await listUsersService(filters);
    return NextResponse.json(
      ok(result.users, { page, limit, total: result.total, hasMore: result.hasMore }),
    );
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(fail(apiErr.message, apiErr.code), { status: apiErr.status });
  }
}

interface CreateUserBody {
  email?: unknown;
  password?: unknown;
  role?: unknown;
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  try {
    requireAdmin(user);
  } catch {
    return NextResponse.json(fail("Admin access required", "FORBIDDEN"), { status: 403 });
  }

  let body: CreateUserBody;
  try {
    body = await req.json() as unknown as CreateUserBody;
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "VALIDATION_ERROR"), { status: 400 });
  }

  const emailErr = isRequiredString(body.email, 1) ?? isEmail(body.email);
  const passwordErr = isRequiredString(body.password, 8);
  const roleErr = isRequiredString(body.role, 1) ?? isEnum(body.role, [...ROLE_VALUES]);

  if (emailErr) return NextResponse.json(fail(emailErr, "VALIDATION_ERROR"), { status: 400 });
  if (passwordErr) return NextResponse.json(fail(passwordErr, "VALIDATION_ERROR"), { status: 400 });
  if (roleErr) return NextResponse.json(fail(roleErr, "VALIDATION_ERROR"), { status: 400 });

  try {
    const newUser = await createUserService(
      body.email as string,
      body.password as string,
      body.role as UserRole,
    );
    return NextResponse.json(ok(newUser), { status: 201 });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(fail(apiErr.message, apiErr.code), { status: apiErr.status });
  }
}