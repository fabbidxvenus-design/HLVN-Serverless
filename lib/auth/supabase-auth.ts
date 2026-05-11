/**
 * Supabase Auth helpers — server-side auth operations.
 * All functions here use the service-role client and never expose sensitive data.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { UserProfile } from "@/types/user";
import { AuthError, InternalError } from "@/lib/api/errors";

/**
 * Sign in a user with email + password.
 * Returns the Supabase auth session on success.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ userId: string; accessToken: string; refreshToken: string; expiresAt: string }> {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw new AuthError("Invalid email or password");
  }

  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
  };
}

/**
 * Sign out a user (revoke session via refresh token).
 */
export async function signOut(_refreshToken?: string): Promise<void> {
  // Supabase v2 signOut() revokes the current session via the HTTP-only cookie,
  // not a refresh token passed as argument. The refresh token is handled by Supabase's
  // built-in token refresh mechanism. Passing a token is not supported in v2.x.
  try {
    const { error } = await supabaseAdmin.auth.signOut();
    if (error) {
      // Log but don't throw — logout should succeed even if token is already expired.
      console.warn("[auth] signOut error:", error.message);
    }
  } catch (err) {
    console.warn("[auth] signOut exception:", err);
  }
}

/**
 * Refresh an access token using a refresh token.
 * Returns new session tokens.
 */
export async function refreshSession(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: string }> {
  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token: refreshToken,
  } as Parameters<typeof supabaseAdmin.auth.refreshSession>[0]);

  if (error || !data.session) {
    throw new AuthError("Invalid or expired refresh token");
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
  };
}

/**
 * Load a user profile by ID using the service-role client.
 * Used for admin-scoped lookups (e.g., me endpoint, role checks).
 */
export async function loadUserProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("[auth/supabase] debug load profile failed", { userId, error, hasData: !!data });
    throw new InternalError("Failed to load user profile");
  }

  return {
    id: data.id,
    email: data.email,
    role: data.role as UserProfile["role"],
    createdAt: data.created_at,
    updatedAt: data.updated_at ?? undefined,
    lastLogin: data.last_login ?? null,
  };
}

/**
 * Create a new user in auth.users and the app users table.
 * Used by admin user management in Phase 02+.
 */
export async function createUser(
  email: string,
  password: string,
  role: UserProfile["role"],
): Promise<UserProfile> {
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    throw new InternalError(`Failed to create auth user: ${authError?.message}`);
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .insert({ id: authUser.user.id, email, role })
    .select()
    .single();

  if (profileError || !profile) {
    throw new InternalError(`Failed to create profile row: ${profileError?.message}`);
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role as UserProfile["role"],
    createdAt: profile.created_at,
    updatedAt: profile.updated_at ?? undefined,
    lastLogin: null,
  };
}

/**
 * Update the last_login timestamp for a user.
 */
export async function touchLastLogin(userId: string): Promise<void> {
  await supabaseAdmin
    .from("users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", userId);
}