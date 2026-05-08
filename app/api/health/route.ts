/**
 * Health check endpoint — GET /api/health
 *
 * Returns a safe success envelope with no secrets, database URLs,
 * or provider details exposed.
 */

import { ok } from "@/lib/api/response";
import { buildCorsHeaders } from "@/lib/api/cors";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  const cors = buildCorsHeaders(origin);

  return Response.json(
    ok({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env["npm_package_version"] ?? "0.1.0",
    }),
    { status: 200, headers: cors },
  );
}

// Also handle OPTIONS for CORS preflight.
export async function OPTIONS(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  const headers = buildCorsHeaders(origin);
  return new Response(null, { status: 204, headers });
}