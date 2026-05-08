/**
 * RouteContext and SessionTokens — shared auth interface used across route handlers.
 * These types are used by auth middleware / helpers and consumed by services.
 */

/** Short-lived JWT access token returned by login/refresh. */
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/**
 * RouteContext is the resolved auth context for an incoming request.
 * Produced by session extraction + user profile lookup; consumed by RBAC checks.
 */
export interface RouteContext {
  user: import("./user").UserProfile;
  accessToken: string;
}