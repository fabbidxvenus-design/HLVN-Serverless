import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  let userCount = 0;
  let userError = "unknown";
  let users: unknown[] = [];

  try {
    const { data, count, error } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact" });

    users = data ?? [];
    userCount = count ?? 0;
    userError = error?.message ?? "null";
  } catch (e) {
    userError = String(e);
  }

  let authUsers: unknown[] = [];
  let authError = "unknown";
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    authUsers = data?.users ?? [];
    authError = error?.message ?? "null";
  } catch (e) {
    authError = String(e);
  }

  return NextResponse.json({
    supabaseUrl: url,
    hasServiceKey,
    users: { count: userCount, error: userError, rows: users },
    auth: { error: authError, count: authUsers.length },
  });
}
