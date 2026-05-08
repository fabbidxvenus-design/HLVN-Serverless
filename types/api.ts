/**
 * API Response Envelope — matches BUILDER-HANDOFF.md exactly.
 * All JSON endpoints return this shape.
 */

// ApiMeta carries pagination and query metadata.
export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// ApiErrorCode covers all expected error scenarios.
export type ApiErrorCode =
  | "AUTH_FAILED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "QUOTA_EXCEEDED"
  | "PROVIDER_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

// ApiResponse is the canonical envelope for all API responses.
// Use ok() / fail() from lib/api/response.ts to construct.
export type ApiResponse<T> =
  | { success: true; data: T; meta?: ApiMeta }
  | { success: false; error: string; code: ApiErrorCode; meta?: ApiMeta };