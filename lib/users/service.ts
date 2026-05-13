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
  updateUserProfile,
  type UserListFilters,
  type PaginatedUsers,
  type UserProfileUpdate,
} from "@/lib/users/repository";
import type { UserProfile, UserRole } from "@/types/user";
import { ValidationError, NotFoundError, InternalError } from "@/lib/api/errors";

export { type UserListFilters, type PaginatedUsers };

export interface UpdateCurrentUserProfileInput {
  displayName?: unknown;
  description?: unknown;
  phone?: unknown;
  jobTitle?: unknown;
  department?: unknown;
  company?: unknown;
  avatarUrl?: unknown;
}

const PROFILE_LIMITS = {
  displayName: 80,
  description: 280,
  phone: 32,
  jobTitle: 80,
  department: 80,
  company: 120,
  avatarUrl: 4096,
};

const PHONE_RE = /^[+()\d\s.-]+$/;

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

export async function updateCurrentUserProfileService(
  userId: string,
  input: UpdateCurrentUserProfileInput,
): Promise<UserProfile> {
  const updates: UserProfileUpdate = {};

  assignProfileText(updates, "display_name", input.displayName, PROFILE_LIMITS.displayName, "Tên hiển thị");
  assignProfileText(updates, "description", input.description, PROFILE_LIMITS.description, "Mô tả");
  assignProfileText(updates, "phone", input.phone, PROFILE_LIMITS.phone, "Số điện thoại");
  assignProfileText(updates, "job_title", input.jobTitle, PROFILE_LIMITS.jobTitle, "Chức danh");
  assignProfileText(updates, "department", input.department, PROFILE_LIMITS.department, "Phòng ban");
  assignProfileText(updates, "company", input.company, PROFILE_LIMITS.company, "Công ty");
  assignProfileText(updates, "avatar_url", input.avatarUrl, PROFILE_LIMITS.avatarUrl, "Ảnh đại diện");

  if (updates.phone && !PHONE_RE.test(updates.phone)) {
    throw new ValidationError("Số điện thoại không hợp lệ");
  }

  if (updates.avatar_url && !isAllowedAvatarUrl(updates.avatar_url)) {
    throw new ValidationError("Ảnh đại diện phải là HTTPS hoặc data image");
  }

  try {
    return await updateUserProfile(userId, updates);
  } catch {
    throw new InternalError("Internal server error");
  }
}

function assignProfileText(
  updates: UserProfileUpdate,
  key: keyof UserProfileUpdate,
  value: unknown,
  maxLength: number,
  label: string,
): void {
  if (value === undefined) return;
  if (value === null) {
    updates[key] = null;
    return;
  }
  if (typeof value !== "string") {
    throw new ValidationError(`${label} không hợp lệ`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${label} không được vượt quá ${maxLength} ký tự`);
  }

  updates[key] = trimmed === "" ? null : trimmed;
}

function isAllowedAvatarUrl(value: string): boolean {
  return value.startsWith("https://") || /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/]+=*$/i.test(value);
}