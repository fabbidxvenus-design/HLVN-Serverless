/**
 * UserProfile and UserRole — core user types.
 * UserRole values are enforced at DB level (CHECK constraint) and service level (RBAC).
 */

export type UserRole = "admin" | "manager" | "user";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
  lastLogin: string | null;
}