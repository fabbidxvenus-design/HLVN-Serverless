/**
 * GET /api/analytics/summary?from=&to=
 * Returns aggregate summary metrics for the admin dashboard.
 * Auth: admin
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/rbac";
import { getAnalyticsSummary } from "@/lib/analytics/service";
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

  try {
    const summary = await getAnalyticsSummary(range);
    return NextResponse.json(ok(summary));
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(fail(apiErr.message, apiErr.code), { status: apiErr.status });
  }
}
