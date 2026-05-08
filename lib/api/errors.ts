/**
 * Typed error classes for API routes.
 * All errors map to an ApiErrorCode and HTTP status.
 * Do not expose raw provider / SQL / stack trace messages.
 */

import type { ApiErrorCode } from "@/types/api";

/** HTTP status code for each ApiErrorCode. */
export const HTTP_STATUS: Record<ApiErrorCode, number> = {
  AUTH_FAILED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  QUOTA_EXCEEDED: 429,
  PROVIDER_ERROR: 502,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get status(): number {
    return HTTP_STATUS[this.code];
  }
}

// Convenience constructors for the most common errors.
export class AuthError extends ApiError {
  constructor(message = "Authentication required", meta?: Record<string, unknown>) {
    super("AUTH_FAILED", message, meta);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Insufficient permissions", meta?: Record<string, unknown>) {
    super("FORBIDDEN", message, meta);
  }
}

export class ValidationError extends ApiError {
  constructor(
    message = "Request validation failed",
    meta?: Record<string, unknown>,
  ) {
    super("VALIDATION_ERROR", message, meta);
  }
}

export class NotFoundError extends ApiError {
  constructor(
    message = "Resource not found",
    meta?: Record<string, unknown>,
  ) {
    super("NOT_FOUND", message, meta);
  }
}

export class QuotaError extends ApiError {
  constructor(message = "Quota exceeded", meta?: Record<string, unknown>) {
    super("QUOTA_EXCEEDED", message, meta);
  }
}

export class ProviderError extends ApiError {
  constructor(
    message = "External service error",
    meta?: Record<string, unknown>,
  ) {
    super("PROVIDER_ERROR", message, meta);
  }
}

export class InternalError extends ApiError {
  constructor(message = "Internal server error", meta?: Record<string, unknown>) {
    super("INTERNAL_ERROR", message, meta);
  }
}

/**
 * Map unknown errors to ApiError.
 * Internal errors are caught and sanitized; no raw messages to clients.
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  // Log internal error details server-side (not sent to client).
  console.error("[InternalError]", err);
  return new InternalError("An unexpected error occurred");
}