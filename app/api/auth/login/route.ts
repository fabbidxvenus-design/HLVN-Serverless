/**
 * POST /api/auth/login
 * Sign in with email + password.
 * Dashboard audience (browser clients) requires admin role.
 * Mobile audience allows any authenticated role.
 */

import { NextRequest, NextResponse } from "next/server";
import { signInWithPassword, touchLastLogin, loadUserProfile } from "@/lib/auth/supabase-auth";
import { requireDashboardAccess } from "@/lib/auth/rbac";
import { ok, fail } from "@/lib/api/response";
import type { UserProfile } from "@/types/user";
import type { SessionTokens } from "@/types/auth";
import { isEmail, isRequiredString, runValidators } from "@/lib/api/validation";

interface LoginBody {
  email?: unknown;
  password?: unknown;
  audience?: unknown;
}

export async function POST(req: NextRequest) {
  let body: LoginBody;
  try {
    body = await req.json() as LoginBody;
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "VALIDATION_ERROR"), { status: 400 });
  }

  // Validate input
  const emailErr = isRequiredString(body.email, 1) ?? isEmail(body.email);
  const passwordErr = isRequiredString(body.password, 1);
  if (emailErr) return NextResponse.json(fail(emailErr, "VALIDATION_ERROR"), { status: 400 });
  if (passwordErr) return NextResponse.json(fail(passwordErr, "VALIDATION_ERROR"), { status: 400 });

  const audience = (body.audience as "dashboard" | "mobile") ?? "mobile";

  // Sign in via Supabase Auth
  let tokens: SessionTokens;
  let userId: string;
  try {
    const result = await signInWithPassword(body.email as string, body.password as string);
    tokens = { accessToken: result.accessToken, refreshToken: result.refreshToken, expiresAt: result.expiresAt };
    userId = result.userId;
  } catch (err) {
    return NextResponse.json(fail("Invalid email or password", "AUTH_FAILED"), { status: 401 });
  }

  // Load profile to check role
  let profile: UserProfile;
  try {
    profile = await loadUserProfile(userId);
  } catch {
    return NextResponse.json(fail("User profile not found", "AUTH_FAILED"), { status: 401 });
  }

  // Dashboard audience requires admin role
  if (audience === "dashboard") {
    try {
      requireDashboardAccess(profile);
    } catch {
      return NextResponse.json(
        fail("Dashboard access is restricted to administrators", "FORBIDDEN"),
        { status: 403 },
      );
    }
  }

  // Touch last login timestamp
  await touchLastLogin(userId).catch(() => {/* non-critical */});

  return NextResponse.json(ok({ user: profile, ...tokens }));
}