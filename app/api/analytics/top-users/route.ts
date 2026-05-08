/**
 * GET /api/analytics/top-users?from=&to=&limit=
 * Returns top users by scan count and API cost.
 * Auth: admin
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/rbac";
import { getAnalyticsTopUsers } from "@/lib/analytics/service";
import { ok, fail } from "@/lib/api/response";
import { toApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  try {
    requireAdmin(user);
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(fail(apiErr.message, apiErr.code), { status: apiErr.status });
  }

  const url = new URL(req.url);
  const range: { from?: string; to?: string } = {};
  const rawFrom = url.searchParams.get("from");
  if (rawFrom !== null) range.from = rawFrom;
  const rawTo = url.searchParams.get("to");
  if (rawTo !== null) range.to = rawTo;

  const limitStr = url.searchParams.get("limit");
  const limit = limitStr !== null ? parseInt(limitStr, 10) : 10;

  try {
    const result = await getAnalyticsTopUsers(range, limit);
    return NextResponse.json(ok(result));
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(fail(apiErr.message, apiErr.code), { status: apiErr.status });
  }
}
