/**
 * Supabase admin client — server-side only.
 * Uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
 * NEVER import this in client-side code.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "[supabase/admin] Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
  );
}

/**
 * Service-role client for admin operations (user management, bulk queries, etc).
 * RLS is bypassed — always enforce RBAC at the service layer before calling this.
 */
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    // Service role does not use auto-refresh tokens.
    autoRefreshToken: false,
    persistSession: false,
  },
});