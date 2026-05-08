import { describe, it, expect } from "vitest";
import type { UserProfile } from "@/types/user";

function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "user-1",
    email: "admin@example.com",
    role: "admin",
    createdAt: "2026-01-01T00:00:00Z",
    lastLogin: null,
    ...overrides,
  };
}

describe("UserProfile shape", () => {
  it("has all required fields", () => {
    const u = makeUser();
    expect(u.id).toBeDefined();
    expect(u.email).toBeDefined();
    expect(u.role).toMatch(/^(admin|manager|user)$/);
    expect(u.createdAt).toBeDefined();
  });

  it("allows optional updatedAt", () => {
    const u = makeUser({ updatedAt: "2026-05-01T00:00:00Z" });
    expect(u.updatedAt).toBe("2026-05-01T00:00:00Z");
  });

  it("allows null lastLogin", () => {
    const u = makeUser({ lastLogin: null });
    expect(u.lastLogin).toBeNull();
  });
});

describe("UserRole enum values", () => {
  it("accepts admin, manager, user", () => {
    const roles: UserProfile["role"][] = ["admin", "manager", "user"];
    roles.forEach((r) => expect(["admin", "manager", "user"]).toContain(r));
  });
});