/**
 * Supabase user-scoped client factory.
 * Creates a client configured with the caller's JWT so RLS policies apply correctly.
 * Use this for operations that should respect RLS (e.g., scan CRUD as user).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "[supabase/user-client] Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

/**
 * Build a user-scoped Supabase client with the caller's JWT.
 * RLS policies apply based on the authenticated user's uid.
 *
 * @param accessToken  The short-lived JWT from the Authorization: Bearer header.
 */
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}