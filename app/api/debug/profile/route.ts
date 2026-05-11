import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id") || "602c7a25-dc27-42e8-9d67-4fb2b8431ce2";

  const { data, error, status } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  return NextResponse.json({ userId, data, error, status });
}
