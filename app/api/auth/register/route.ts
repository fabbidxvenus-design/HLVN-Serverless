/**
 * POST /api/auth/register
 * Register a new mobile user with email + password.
 */

import { NextRequest, NextResponse } from "next/server";
import { createUser, signInWithPassword } from "@/lib/auth/supabase-auth";
import { ApiError, toApiError } from "@/lib/api/errors";
import { ok, fail } from "@/lib/api/response";
import { isEmail, isRequiredString } from "@/lib/api/validation";
import type { SessionTokens } from "@/types/auth";

interface RegisterBody {
  email?: unknown;
  password?: unknown;
  audience?: unknown;
}

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
  let body: RegisterBody;
  try {
    body = await req.json() as RegisterBody;
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "VALIDATION_ERROR"), { status: 400 });
  }

  const emailErr = isRequiredString(body.email, 1) ?? isEmail(body.email);
  const passwordErr = isRequiredString(body.password, MIN_PASSWORD_LENGTH);
  if (emailErr) return NextResponse.json(fail(emailErr, "VALIDATION_ERROR"), { status: 400 });
  if (passwordErr) return NextResponse.json(fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, "VALIDATION_ERROR"), { status: 400 });

  const audience = body.audience ?? "mobile";
  if (audience !== "mobile" && audience !== "dashboard") {
    return NextResponse.json(fail("Invalid audience", "VALIDATION_ERROR"), { status: 400 });
  }
  if (audience === "dashboard") {
    return NextResponse.json(fail("Dashboard users must be created by an administrator", "FORBIDDEN"), { status: 403 });
  }

  try {
    const profile = await createUser(body.email as string, body.password as string, "user");
    const result = await signInWithPassword(body.email as string, body.password as string);
    const tokens: SessionTokens = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
    };

    return NextResponse.json(ok({ user: profile, ...tokens }), { status: 201 });
  } catch (err: unknown) {
    const apiError = err instanceof ApiError ? err : toApiError(err);
    return NextResponse.json(fail(apiError.message, apiError.code), { status: apiError.status });
  }
}
