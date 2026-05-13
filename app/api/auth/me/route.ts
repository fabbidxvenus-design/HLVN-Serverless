/**
 * GET /api/auth/me
 * Return the current authenticated user's profile.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ApiError, InternalError } from "@/lib/api/errors";
import { ok, fail } from "@/lib/api/response";
import { updateCurrentUserProfileService, type UpdateCurrentUserProfileInput } from "@/lib/users/service";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  return NextResponse.json(ok(user));
}

export async function PATCH(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch (err: unknown) {
    const message = err instanceof ApiError ? err.message : "Authentication required";
    return NextResponse.json(fail(message, "AUTH_FAILED"), { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "VALIDATION_ERROR"), { status: 400 });
  }

  try {
    const updated = await updateCurrentUserProfileService(user.id, pickProfileInput(body));
    return NextResponse.json(ok(updated));
  } catch (err: unknown) {
    const apiError = err instanceof ApiError ? err : new InternalError();
    return NextResponse.json(fail(apiError.message, apiError.code), { status: apiError.status });
  }
}

function pickProfileInput(body: unknown): UpdateCurrentUserProfileInput {
  if (!body || typeof body !== "object") return {};
  const input = body as Record<string, unknown>;
  return {
    ...(Object.prototype.hasOwnProperty.call(input, "displayName") ? { displayName: input.displayName } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "description") ? { description: input.description } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "phone") ? { phone: input.phone } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "jobTitle") ? { jobTitle: input.jobTitle } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "department") ? { department: input.department } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "company") ? { company: input.company } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "avatarUrl") ? { avatarUrl: input.avatarUrl } : {}),
  };
}