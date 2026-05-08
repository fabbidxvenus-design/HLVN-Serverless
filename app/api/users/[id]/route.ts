/**
 * GET /api/users/[id]  — get user by id (admin only)
 * DELETE /api/users/[id] — delete user (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/rbac";
import { getUserById } from "@/lib/users/repository";
import { deleteUserService } from "@/lib/users/service";
import { deleteUserScans } from "@/lib/scans/repository";
import { deleteStorageForUser } from "@/lib/scans/service";
import { ok, fail } from "@/lib/api/response";
import { toApiError } from "@/lib/api/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
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

  const { id } = await params;

  const profile = await getUserById(id);
  if (!profile) {
    return NextResponse.json(fail(`User ${id} not found`, "NOT_FOUND"), { status: 404 });
  }

  return NextResponse.json(ok(profile));
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

  const { id } = await params;

  try {
    // Cascade: delete scans + storage for this user
    await deleteUserScans(id);
    await deleteStorageForUser(id);
    await deleteUserService(id);
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(fail(apiErr.message, apiErr.code), { status: apiErr.status });
  }

  return NextResponse.json(ok({ deleted: true, id }));
}