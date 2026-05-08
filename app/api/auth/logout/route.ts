/**
 * POST /api/auth/logout
 * Sign out the current user.
 * Requires valid Authorization header (access token).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/supabase-auth";
import { ok, fail } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  // Require authenticated user (access token used for signOut context)
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  await signOut().catch((err) => {
    console.warn(`[auth/logout] signOut failed for user ${user.id}:`, err);
  });

  return NextResponse.json(ok({ ok: true }));
}