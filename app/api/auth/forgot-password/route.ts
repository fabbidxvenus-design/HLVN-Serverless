import { NextRequest, NextResponse } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { handlePreflight } from "@/lib/api/cors";
import { isEmail, isRequiredString } from "@/lib/api/validation";
import { sendPasswordResetEmail } from "@/lib/auth/supabase-auth";
import { getClientIp, isRateLimited } from "@/lib/api/rate-limit";

interface ForgotPasswordBody {
  email?: unknown;
}

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req);
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  if (isRateLimited(`forgot-password:${clientIp}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(fail("Too many reset requests. Please try again later.", "RATE_LIMITED"), { status: 429 });
  }

  let body: ForgotPasswordBody;
  try {
    body = await req.json() as ForgotPasswordBody;
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "VALIDATION_ERROR"), { status: 400 });
  }

  const emailErr = isRequiredString(body.email, 1) ?? isEmail(body.email);
  if (emailErr) {
    return NextResponse.json(fail(emailErr, "VALIDATION_ERROR"), { status: 400 });
  }

  const frontendUrl = process.env["APP_FRONTEND_URL"] ?? process.env["CORS_ORIGINS"]?.split(",")[0]?.trim();
  const redirectTo = frontendUrl ? `${frontendUrl.replace(/\/+$/, "")}/reset-password` : undefined;

  try {
    await sendPasswordResetEmail(body.email as string, redirectTo);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      console.error("[auth/forgot-password] reset email failed", {
        code: err.code,
        message: err.message,
        meta: err.meta,
      });
    } else {
      console.error("[auth/forgot-password] reset email failed", err);
    }
    return NextResponse.json(fail("Failed to send password reset email", "INTERNAL_ERROR"), { status: 500 });
  }

  return NextResponse.json(ok({ success: true }));
}
