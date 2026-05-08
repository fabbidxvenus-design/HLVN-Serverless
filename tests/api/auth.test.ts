import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractBearerToken } from "@/lib/auth/session";
import type { SessionTokens } from "@/types/auth";

// We'll mock lib/auth/supabase-auth in the route tests
vi.mock("@/lib/auth/supabase-auth", () => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  refreshSession: vi.fn(),
  touchLastLogin: vi.fn(),
  loadUserProfile: vi.fn(),
}));

describe("extractBearerToken", () => {
  it("returns token from valid Bearer header", () => {
    expect(extractBearerToken("Bearer abc123xyz")).toBe("abc123xyz");
  });

  it("handles lowercase bearer", () => {
    expect(extractBearerToken("bearer abc123")).toBe("abc123");
  });

  it("handles token with trailing whitespace", () => {
    expect(extractBearerToken("Bearer abc123   ")).toBe("abc123");
  });

  it("returns null for missing header", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it("returns null for non-Bearer scheme", () => {
    expect(extractBearerToken("Basic abc123")).toBeNull();
  });

  it("returns null for malformed header", () => {
    expect(extractBearerToken("Bearer")).toBeNull();
    expect(extractBearerToken("")).toBeNull();
  });
});

describe("SessionTokens shape", () => {
  it("has required fields", () => {
    const tokens: SessionTokens = {
      accessToken: "at",
      refreshToken: "rt",
      expiresAt: "2026-01-01T00:00:00Z",
    };
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.expiresAt).toBeDefined();
  });
});