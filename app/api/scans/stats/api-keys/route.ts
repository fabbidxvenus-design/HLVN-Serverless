/**
 * GET /api/scans/stats/api-keys
 * Returns API key usage statistics aggregated from scans table.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  // Non-admin users only see their own stats
  const userId = user.role === "admin" ? undefined : user.id;

  let query = supabaseAdmin
    .from("scans")
    .select("api_key_index, token_usage");

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(fail("Failed to load stats", "INTERNAL_ERROR"), { status: 500 });
  }

  let key1Count = 0;
  let key2Count = 0;
  let key1Cost = 0;
  let key2Cost = 0;

  for (const scan of data ?? []) {
    const apiKeyIndex = scan.api_key_index as number;
    const tokenUsage = scan.token_usage as { input: number; output: number; cost: number };

    if (apiKeyIndex === 1) {
      key1Count++;
      key1Cost += tokenUsage.cost ?? 0;
    } else if (apiKeyIndex === 2) {
      key2Count++;
      key2Cost += tokenUsage.cost ?? 0;
    }
  }

  return NextResponse.json(ok({ key1Count, key2Count, key1Cost, key2Cost }));
}
