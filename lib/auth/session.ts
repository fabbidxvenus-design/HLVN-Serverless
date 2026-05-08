/**
 * Session helpers — extract and validate Bearer tokens.
 * These run on the server and load the UserProfile from Supabase.
 *
 * Supabase clients are lazy-loaded (not module-level) so that unit tests
 * for extractBearerToken() can run without environment variables being set.
 */

import type { UserProfile } from "@/types/user";
import { AuthError } from "@/lib/api/errors";

/** Regex for "Bearer <token>" in Authorization header. */
const BEARER_RE = /^Bearer\s+(\S+)\s*$/i;

/**
 * Extract the Bearer token from an Authorization header value.
 * Returns null if missing or malformed.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(BEARER_RE);
  if (!match) return null;
  // Trim: handles trailing whitespace after the token that $ would otherwise reject.
  return match[1]?.trim() ?? null;
}

/**
 * Load the current UserProfile for an authenticated request.
 *
 * Steps:
 *   1. Validate and extract Bearer token.
 *   2. Verify the token with Supabase (getUser).
 *   3. Load the user's profile row from the `users` table.
 *
 * Throws AuthError on failure — callers must handle 401 responses.
 */
export async function getCurrentUser(authHeader: string | null): Promise<UserProfile> {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  const token = extractBearerToken(authHeader);
  if (!token) {
    throw new AuthError("Missing or malformed Authorization header");
  }

  // Verify the JWT and get the Supabase auth user.
  const { data: authUser, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authUser?.user) {
    throw new AuthError("Invalid or expired access token");
  }

  // Load the app-level profile from the `users` table.
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", authUser.user.id)
    .single();

  if (profileError || !profile) {
    // Auth succeeded but profile row is missing — user is logged in via Supabase
    // but has no app profile yet. Treat as auth failure until onboarding creates it.
    throw new AuthError("User profile not found; please contact support");
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role as UserProfile["role"],
    createdAt: profile.created_at,
    updatedAt: profile.updated_at ?? undefined,
    lastLogin: profile.last_login ?? null,
  };
}

/**
 * Build a user-scoped Supabase client using an Authorization header.
 * Convenience for services that need to run queries as the authenticated user.
 */
export async function userClientFromHeader(authHeader: string | null) {
  const { createUserClient } = await import("@/lib/supabase/user-client");
  const token = extractBearerToken(authHeader);
  if (!token) throw new AuthError("Missing Authorization header");
  return createUserClient(token);
}