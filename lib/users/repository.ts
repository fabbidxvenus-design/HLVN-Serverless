/**
 * User repository — data access layer for the `users` table.
 * All methods use the service-role client (RLS bypassed).
 * Business rules are enforced by the service layer above.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { UserProfile, UserRole } from "@/types/user";

export interface UserListFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
}

export interface PaginatedUsers {
  users: UserProfile[];
  total: number;
  hasMore: boolean;
}

export interface UserProfileUpdate {
  display_name?: string | null;
  description?: string | null;
  phone?: string | null;
  job_title?: string | null;
  department?: string | null;
  company?: string | null;
  avatar_url?: string | null;
}

/**
 * List users with optional pagination and filtering.
 */
export async function listUsers(filters: UserListFilters = {}): Promise<PaginatedUsers> {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const offset = (page - 1) * limit;

  let query = supabaseAdmin.from("users").select("*", { count: "exact" });

  if (filters.role) {
    query = query.eq("role", filters.role);
  }

  if (filters.search) {
    query = query.ilike("email", `%${filters.search}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const users: UserProfile[] = (data ?? []).map(rowToProfile);

  return {
    users,
    total: count ?? 0,
    hasMore: offset + (data?.length ?? 0) < (count ?? 0),
  };
}

/**
 * Get a single user by ID.
 */
export async function getUserById(id: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin.from("users").select("*").eq("id", id).single();
  if (error) return null;
  return rowToProfile(data);
}

/**
 * Get a single user by email.
 */
export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin.from("users").select("*").eq("email", email).single();
  if (error) return null;
  return rowToProfile(data);
}

/**
 * Count how many admins exist in the system.
 */
export async function countAdmins(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact" })
    .eq("role", "admin");

  if (error) throw error;
  return count ?? 0;
}

/**
 * Delete a user and cascade-delete their scans.
 */
export async function deleteUser(id: string): Promise<void> {
  // Cascade: scans are deleted via DB foreign key ON DELETE CASCADE.
  // Storage objects for scans are cleaned up by the caller (service layer).
  const { error } = await supabaseAdmin.from("users").delete().eq("id", id);
  if (error) throw error;
}

export async function updateUserProfile(
  id: string,
  updates: UserProfileUpdate,
): Promise<UserProfile> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw error;
  return rowToProfile(data);
}

// ── Internal ──────────────────────────────────────────────────────────────────

function rowToProfile(row: {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at?: string | null;
  last_login?: string | null;
  display_name?: string | null;
  description?: string | null;
  phone?: string | null;
  job_title?: string | null;
  department?: string | null;
  company?: string | null;
  avatar_url?: string | null;
}): UserProfile {
  const lastLogin: string | null = (row.last_login ?? null) as string | null;
  const updatedAt: string | undefined = row.updated_at ?? undefined;
  return {
    id: row.id,
    email: row.email,
    role: row.role as UserRole,
    createdAt: row.created_at,
    ...(updatedAt !== undefined ? { updatedAt } : {}),
    lastLogin,
    displayName: row.display_name ?? null,
    description: row.description ?? null,
    phone: row.phone ?? null,
    jobTitle: row.job_title ?? null,
    department: row.department ?? null,
    company: row.company ?? null,
    avatarUrl: row.avatar_url ?? null,
  };
}