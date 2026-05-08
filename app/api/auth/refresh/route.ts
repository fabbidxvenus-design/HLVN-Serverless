/**
 * POST /api/auth/refresh
 * Exchange a refresh token for new access + refresh tokens.
 * Public — no Authorization header required, just the refresh token.
 */

import { NextRequest, NextResponse } from "next/server";
import { refreshSession } from "@/lib/auth/supabase-auth";
import { ok, fail } from "@/lib/api/response";
import { isRequiredString } from "@/lib/api/validation";

interface RefreshBody {
  refreshToken?: unknown;
}

export async function POST(req: NextRequest) {
  let body: RefreshBody;
  try {
    body = await req.json() as unknown as RefreshBody;
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "VALIDATION_ERROR"), { status: 400 });
  }

  const tokenErr = isRequiredString(body.refreshToken, 1);
  if (tokenErr) {
    return NextResponse.json(fail(tokenErr, "VALIDATION_ERROR"), { status: 400 });
  }

  try {
    const tokens = await refreshSession(body.refreshToken as string);
    return NextResponse.json(ok(tokens));
  } catch {
    return NextResponse.json(fail("Invalid or expired refresh token", "AUTH_FAILED"), { status: 401 });
  }
}