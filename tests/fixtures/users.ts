/**
 * Test fixtures — users.
 * Returns stable mock data for unit and integration tests.
 */

import type { UserProfile } from "@/types/user";

export const ADMIN_USER: UserProfile = {
  id: "admin-uuid-001",
  email: "admin@hlvn.app",
  role: "admin",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  lastLogin: null,
};

export const MANAGER_USER: UserProfile = {
  id: "manager-uuid-001",
  email: "manager@hlvn.app",
  role: "manager",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  lastLogin: null,
};

export const REGULAR_USER: UserProfile = {
  id: "user-uuid-001",
  email: "user@hlvn.app",
  role: "user",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  lastLogin: null,
};

export const USERS = [ADMIN_USER, MANAGER_USER, REGULAR_USER];

export function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return { ...REGULAR_USER, ...overrides };
}
