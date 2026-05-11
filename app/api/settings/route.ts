/**
 * GET /api/settings — get user settings
 * PATCH /api/settings — update user settings
 *
 * For local integration: returns in-memory defaults per user.
 * Production can persist to DB if needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";

interface AppSettings {
  id: string;
  selectedModelTier: "free" | "default" | "high";
  lastUpdated?: string;
}

// In-memory store per userId
const settingsStore = new Map<string, AppSettings>();

function getDefaultSettings(userId: string): AppSettings {
  return {
    id: userId,
    selectedModelTier: "default",
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  const settings = settingsStore.get(user.id) ?? getDefaultSettings(user.id);
  return NextResponse.json(ok(settings));
}

export async function PATCH(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(fail("Authentication required", "AUTH_FAILED"), { status: 401 });
  }

  let body: Partial<AppSettings>;
  try {
    body = await req.json() as Partial<AppSettings>;
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "VALIDATION_ERROR"), { status: 400 });
  }

  const current = settingsStore.get(user.id) ?? getDefaultSettings(user.id);
  const updated: AppSettings = {
    ...current,
    ...(body.selectedModelTier ? { selectedModelTier: body.selectedModelTier } : {}),
    lastUpdated: new Date().toISOString(),
  };

  settingsStore.set(user.id, updated);
  return NextResponse.json(ok(updated));
}
