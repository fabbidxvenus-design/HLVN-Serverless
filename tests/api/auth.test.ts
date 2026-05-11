import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractBearerToken } from "@/lib/auth/session";
import type { SessionTokens } from "@/types/auth";

// We'll mock lib/auth/supabase-auth in the route tests
vi.mock("@/lib/auth/supabase-auth", () => ({
  createUser: vi.fn(),
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

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a mobile user account and returns a session", async () => {
    const auth = await import("@/lib/auth/supabase-auth");
    vi.mocked(auth.createUser).mockResolvedValue({
      id: "user-1",
      email: "new@example.com",
      role: "user",
      createdAt: "2026-05-10T00:00:00.000Z",
      lastLogin: null,
    });
    vi.mocked(auth.signInWithPassword).mockResolvedValue({
      userId: "user-1",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: "2026-05-10T01:00:00.000Z",
    });

    const { POST } = await import("@/app/api/auth/register/route");
    const req = new Request("http://localhost:3001/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "new@example.com",
        password: "password123",
        audience: "mobile",
      }),
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(auth.createUser).toHaveBeenCalledWith("new@example.com", "password123", "user");
    expect(body).toEqual({
      success: true,
      data: {
        user: {
          id: "user-1",
          email: "new@example.com",
          role: "user",
          createdAt: "2026-05-10T00:00:00.000Z",
          lastLogin: null,
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: "2026-05-10T01:00:00.000Z",
      },
    });
  });
});
