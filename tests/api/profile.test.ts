import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError, InternalError, ValidationError } from "@/lib/api/errors";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/users/service", () => ({
  updateCurrentUserProfileService: vi.fn(),
}));

const expandedUser = {
  id: "user-1",
  email: "worker@example.com",
  role: "user" as const,
  createdAt: "2026-05-10T00:00:00.000Z",
  updatedAt: "2026-05-11T00:00:00.000Z",
  lastLogin: null,
  displayName: "Nguyen Van A",
  description: "Nhân viên kho",
  phone: "+84 900 000 000",
  jobTitle: "Warehouse Operator",
  department: "Kho thành phẩm",
  company: "HLVN",
  avatarUrl: null,
};

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns expanded current user profile", async () => {
    const session = await import("@/lib/auth/session");
    vi.mocked(session.getCurrentUser).mockResolvedValue(expandedUser);

    const { GET } = await import("@/app/api/auth/me/route");
    const req = new Request("http://localhost:3001/api/auth/me", {
      headers: { Authorization: "Bearer token" },
    });

    const res = await GET(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, data: expandedUser });
  });
});

describe("PATCH /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the authenticated user's editable profile fields", async () => {
    const session = await import("@/lib/auth/session");
    const service = await import("@/lib/users/service");
    vi.mocked(session.getCurrentUser).mockResolvedValue(expandedUser);
    vi.mocked(service.updateCurrentUserProfileService).mockResolvedValue({
      ...expandedUser,
      displayName: "Tran Thi B",
      description: null,
    });

    const { PATCH } = await import("@/app/api/auth/me/route");
    const req = new Request("http://localhost:3001/api/auth/me", {
      method: "PATCH",
      headers: { Authorization: "Bearer token" },
      body: JSON.stringify({
        displayName: "Tran Thi B",
        description: "",
        phone: "+84 900 000 000",
        role: "admin",
      }),
    });

    const res = await PATCH(req as never);
    const body = await res.json();

    expect(service.updateCurrentUserProfileService).toHaveBeenCalledWith("user-1", {
      displayName: "Tran Thi B",
      description: "",
      phone: "+84 900 000 000",
    });
    expect(res.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: { ...expandedUser, displayName: "Tran Thi B", description: null },
    });
  });

  it("returns validation error for invalid profile input", async () => {
    const session = await import("@/lib/auth/session");
    const service = await import("@/lib/users/service");
    vi.mocked(session.getCurrentUser).mockResolvedValue(expandedUser);
    vi.mocked(service.updateCurrentUserProfileService).mockRejectedValue(
      new ValidationError("Số điện thoại không hợp lệ"),
    );

    const { PATCH } = await import("@/app/api/auth/me/route");
    const req = new Request("http://localhost:3001/api/auth/me", {
      method: "PATCH",
      headers: { Authorization: "Bearer token" },
      body: JSON.stringify({ phone: "abc" }),
    });

    const res = await PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: "Số điện thoại không hợp lệ",
      code: "VALIDATION_ERROR",
    });
  });

  it("returns auth failure when bearer token is missing or invalid", async () => {
    const session = await import("@/lib/auth/session");
    vi.mocked(session.getCurrentUser).mockRejectedValue(new AuthError("Authentication required"));

    const { PATCH } = await import("@/app/api/auth/me/route");
    const req = new Request("http://localhost:3001/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify({ displayName: "A" }),
    });

    const res = await PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: "Authentication required",
      code: "AUTH_FAILED",
    });
  });

  it("sanitizes unexpected profile update errors", async () => {
    const session = await import("@/lib/auth/session");
    const service = await import("@/lib/users/service");
    vi.mocked(session.getCurrentUser).mockResolvedValue(expandedUser);
    vi.mocked(service.updateCurrentUserProfileService).mockRejectedValue(new InternalError());

    const { PATCH } = await import("@/app/api/auth/me/route");
    const req = new Request("http://localhost:3001/api/auth/me", {
      method: "PATCH",
      headers: { Authorization: "Bearer token" },
      body: JSON.stringify({ displayName: "A" }),
    });

    const res = await PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  });
});
