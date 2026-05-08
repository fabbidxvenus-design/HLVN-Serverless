/**
 * Response helpers — construct ApiResponse envelopes.
 * Use ok() for success, fail() for errors.
 * Routes should return these directly; HTTP status is passed separately.
 */

import type { ApiMeta, ApiResponse, ApiErrorCode } from "@/types/api";

/**
 * Build a success envelope.
 * @param data  The payload to return.
 * @param meta  Optional pagination / query metadata.
 */
export function ok<T>(data: T, meta?: ApiMeta): ApiResponse<T> {
  return meta ? { success: true, data, meta } : { success: true, data };
}

/**
 * Build an error envelope.
 * @param error Human-readable message — safe to return to clients.
 * @param code  Typed error code.
 * @param meta  Optional metadata (e.g. validation field path).
 */
export function fail(
  error: string,
  code: ApiErrorCode,
  meta?: ApiMeta,
): ApiResponse<never> {
  return meta
    ? { success: false, error, code, meta }
    : { success: false, error, code };
}