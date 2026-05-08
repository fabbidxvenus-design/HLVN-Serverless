/**
 * CORS helper for Next.js Route Handlers.
 *
 * Reads allowed origins from CORS_ORIGINS env var (comma-separated).
 * Returns CORS headers for preflight OPTIONS and safe origin reflection for GET/POST.
 *
 * Usage in route.ts:
 *   return handler(req, { headers: corsHeaders(req) });
 */

const LOCAL_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
];

const STAGING_ORIGINS = [
  "https://dashboard-staging.vercel.app",
  "https://mobile-staging.vercel.app",
];

/** Parse CORS_ORIGINS env var into an array, with defaults. */
function getAllowedOrigins(): string[] {
  const env = process.env["CORS_ORIGINS"];
  if (env) {
    return env.split(",").map((s) => s.trim()).filter(Boolean);
  }
  // Fallback to documented defaults when env is not set (local dev).
  return [...LOCAL_ORIGINS, ...STAGING_ORIGINS];
}

function isAllowedOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  // In development without CORS_ORIGINS set, also allow any localhost origin.
  if (
    allowedOrigins.length === 0 ||
    (allowedOrigins.length === LOCAL_ORIGINS.length + STAGING_ORIGINS.length &&
      process.env["NODE_ENV"] !== "production")
  ) {
    return origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1");
  }
  return allowedOrigins.includes(origin);
}

/** Build CORS response headers for a given request origin. */
export function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };

  if (isAllowedOrigin(origin, allowedOrigins)) {
    // origin is guaranteed non-null when isAllowedOrigin returns true
    headers["Access-Control-Allow-Origin"] = origin as string;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

/** Return CORS headers object to merge into a NextResponse. */
export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  return buildCorsHeaders(origin);
}

/**
 * Handle an OPTIONS preflight request.
 * Returns a 204 Response with CORS headers (no body).
 */
export function handlePreflight(request: Request): Response {
  const origin = request.headers.get("Origin");
  const headers = buildCorsHeaders(origin);
  return new Response(null, { status: 204, headers });
}