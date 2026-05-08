/**
 * User service — business logic for user management.
 * Enforces last-admin protection and other rules.
 */

import { createUser } from "@/lib/auth/supabase-auth";
import {
  listUsers,
  getUserById,
  countAdmins,
  deleteUser,
  type UserListFilters,
  type PaginatedUsers,
} from "@/lib/users/repository";
import type { UserProfile, UserRole } from "@/types/user";
import { ValidationError, NotFoundError, InternalError } from "@/lib/api/errors";

export { type UserListFilters, type PaginatedUsers };

/**
 * List users with pagination (admin only — called from route after requireAdmin).
 */
export async function listUsersService(filters: UserListFilters): Promise<PaginatedUsers> {
  return listUsers(filters);
}

/**
 * Create a new user (admin only).
 * @throws ValidationError if email already exists.
 * @throws InternalError if creation fails.
 */
export async function createUserService(
  email: string,
  password: string,
  role: UserRole,
): Promise<UserProfile> {
  if (password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }

  try {
    return await createUser(email, password, role);
  } catch (err) {
    // Email uniqueness violation maps to validation error
    if (err instanceof Error && err.message.includes("duplicate")) {
      throw new ValidationError("A user with this email already exists");
    }
    throw err;
  }
}

/**
 * Update a user's role (admin only).
 * Protects the last admin from demotion.
 * @throws NotFoundError if user does not exist.
 * @throws ValidationError if demoting the last admin.
 */
export async function updateRoleService(
  userId: string,
  newRole: UserRole,
): Promise<UserProfile> {
  const user = await getUserById(userId);
  if (!user) throw new NotFoundError(`User ${userId} not found`);

  if (user.role === "admin" && newRole !== "admin") {
    // Trying to demote an admin — check if they're the last one
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      throw new ValidationError("Cannot demote the last administrator");
    }
  }

  // Apply the role change
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  const { data, error } = await supabaseAdmin
    .from("users")
    .update({ role: newRole })
    .eq("id", userId)
    .select()
    .single();

  if (error || !data) throw new InternalError("Failed to update role");

  return {
    id: data.id,
    email: data.email,
    role: data.role as UserRole,
    createdAt: data.created_at,
    updatedAt: data.updated_at ?? undefined,
    lastLogin: data.last_login ?? null,
  };
}

/**
 * Delete a user (admin only).
 * Protects the last admin from deletion and cascades scan deletion.
 * @throws NotFoundError if user does not exist.
 * @throws ValidationError if deleting the last admin.
 */
export async function deleteUserService(userId: string): Promise<string> {
  const user = await getUserById(userId);
  if (!user) throw new NotFoundError(`User ${userId} not found`);

  if (user.role === "admin") {
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      throw new ValidationError("Cannot delete the last administrator");
    }
  }

  await deleteUser(userId);
  return userId;
}