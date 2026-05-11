import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface DebugLoginRequest {
  email: string;
  password: string;
}

function isDebugLoginRequest(value: unknown): value is DebugLoginRequest {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return typeof body.email === "string" && body.email.includes("@") && typeof body.password === "string" && body.password.length > 0;
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  if (!isDebugLoginRequest(body)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, password } = body;

  // Step 1: Sign in via Supabase Auth
  let authSuccess = false;
  let userId: string | null = null;
  let authError: string | null = null;
  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    authSuccess = !!data.session;
    userId = data.session?.user?.id ?? null;
    authError = error?.message ?? null;
  } catch (e) {
    authError = String(e);
  }

  // Step 2: Direct lookup by ID
  let profileById: unknown = null;
  let profileByIdError: string | null = null;
  if (userId) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    profileById = data;
    profileByIdError = error?.message ?? null;
  }

  return NextResponse.json({
    auth: {
      success: authSuccess,
      userId,
      error: authError,
    },
    profileById: {
      data: profileById,
      error: profileByIdError,
    },
  });
}
