/**
 * Validation helpers for route-level input checking.
 * Each helper returns null on success or a validation error message string on failure.
 * Route handlers map these to ApiResponse fail() with code VALIDATION_ERROR.
 */

// ── Primitives ────────────────────────────────────────────────────────────────

/** Check that a value is a string and is non-empty. */
export function isRequiredString(
  value: unknown,
  minLength = 1,
  maxLength?: number,
): string | null {
  if (typeof value !== "string") return "Expected a string";
  if (value.length < minLength) return `Must be at least ${minLength} character(s)`;
  if (maxLength !== undefined && value.length > maxLength)
    return `Must be at most ${maxLength} characters`;
  return null;
}

/** Check that a value is a valid email address. */
export function isEmail(value: unknown): string | null {
  if (typeof value !== "string") return "Expected a string";
  // RFC-5322-ish simple check — Supabase enforces format on auth side.
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(value)) return "Invalid email address";
  return null;
}

/** Check that a value is a positive integer within an optional range. */
export function isPositiveInt(
  value: unknown,
  min = 1,
  max?: number,
): string | null {
  if (typeof value !== "number" || !Number.isInteger(value))
    return "Expected an integer";
  if (value < min) return `Must be at least ${min}`;
  if (max !== undefined && value > max) return `Must be at most ${max}`;
  return null;
}

/** Check that a value is a valid ISO-8601 date string. */
export function isISODateString(value: unknown): string | null {
  if (typeof value !== "string") return "Expected an ISO date string";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Invalid date format; use ISO-8601 (e.g. 2026-05-08)";
  return null;
}

// ── Enums / Literals ──────────────────────────────────────────────────────────

/** Check that a string value is one of the allowed enum values. */
export function isEnum(value: unknown, enumValues: string[]): string | null {
  if (typeof value !== "string") return "Expected a string";
  if (!enumValues.includes(value))
    return `Must be one of: ${enumValues.join(", ")}`;
  return null;
}

// ── File / Media ──────────────────────────────────────────────────────────────

/** Check that a string is an allowed MIME type. */
export function isFileContentType(
  value: unknown,
  allowedTypes: string[],
): string | null {
  if (typeof value !== "string") return "Expected a string";
  if (!allowedTypes.includes(value))
    return `Content-Type must be one of: ${allowedTypes.join(", ")}`;
  return null;
}

/** Check that a number represents a file size in bytes within the limit. */
export function isFileSizeBytes(value: unknown, maxBytes: number): string | null {
  if (typeof value !== "number") return "Expected a number";
  if (value < 0) return "File size cannot be negative";
  if (value > maxBytes) return `File size exceeds ${maxBytes} bytes`;
  return null;
}

// ── Composite helpers ─────────────────────────────────────────────────────────

/**
 * Run multiple validators on a value; return first error or null.
 */
export function runValidators(
  value: unknown,
  ...validators: Array<(v: unknown) => string | null>
): string | null {
  for (const validator of validators) {
    const err = validator(value);
    if (err !== null) return err;
  }
  return null;
}

/**
 * Validate a full object using a field->validator map.
 * Returns an object { [field]: errorMessage } with only failed fields.
 */
export function validateObject<T extends Record<string, unknown>>(
  obj: T,
  rules: { [K in keyof T]?: Array<(v: unknown) => string | null> },
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};
  for (const [key, validators] of Object.entries(rules)) {
    if (!validators) continue;
    for (const validator of validators) {
      const err = validator(obj[key as keyof T]);
      if (err !== null) {
        (errors as Record<string, string>)[key] = err;
        break;
      }
    }
  }
  return errors;
}