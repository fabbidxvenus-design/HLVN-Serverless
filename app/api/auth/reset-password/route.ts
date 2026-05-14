import { NextRequest, NextResponse } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { handlePreflight } from "@/lib/api/cors";
import { isRequiredString } from "@/lib/api/validation";
import { updatePasswordWithAccessToken, updatePasswordWithCode } from "@/lib/auth/supabase-auth";
import { extractBearerToken } from "@/lib/auth/session";
import { getClientIp, isRateLimited } from "@/lib/api/rate-limit";

const MIN_PASSWORD_LENGTH = 8;

interface ResetPasswordBody {
  password?: unknown;
  code?: unknown;
}

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req);
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  if (isRateLimited(`reset-password:${clientIp}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(fail("Too many password reset attempts. Please try again later.", "RATE_LIMITED"), { status: 429 });
  }

  const accessToken = extractBearerToken(req.headers.get("Authorization"));

  let body: ResetPasswordBody;
  try {
    body = await req.json() as ResetPasswordBody;
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "VALIDATION_ERROR"), { status: 400 });
  }

  const passwordErr = isRequiredString(body.password, MIN_PASSWORD_LENGTH);
  if (passwordErr) {
    return NextResponse.json(fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, "VALIDATION_ERROR"), { status: 400 });
  }

  const codeErr = body.code === undefined ? undefined : isRequiredString(body.code, 1);
  if (codeErr) {
    return NextResponse.json(fail("Password reset code is invalid", "VALIDATION_ERROR"), { status: 400 });
  }

  if (!accessToken && (typeof body.code !== "string" || body.code.trim().length === 0)) {
    return NextResponse.json(fail("Password reset token is required", "AUTH_FAILED"), { status: 401 });
  }

  try {
    if (typeof body.code === "string" && body.code.trim().length > 0) {
      await updatePasswordWithCode(body.code, body.password as string);
    } else {
      await updatePasswordWithAccessToken(accessToken as string, body.password as string);
    }
  } catch (err: unknown) {
    console.error("[auth/reset-password] password update failed", err);
    return NextResponse.json(fail("Invalid or expired password reset link", "AUTH_FAILED"), { status: 401 });
  }

  return NextResponse.json(ok({ success: true }));
}
