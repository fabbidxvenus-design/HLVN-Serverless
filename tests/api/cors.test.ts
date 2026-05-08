import { describe, it, expect } from "vitest";
import { buildCorsHeaders, corsHeaders, handlePreflight } from "@/lib/api/cors";

describe("buildCorsHeaders", () => {
  it("sets Access-Control-Allow-Origin for allowed localhost origins", () => {
    // localhost origins are always allowed in non-production defaults.
    const headers = buildCorsHeaders("http://localhost:3000");
    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:3000");
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    expect(headers["Access-Control-Allow-Methods"]).toContain("GET");
  });

  it("omits Access-Control-Allow-Origin for disallowed origins", () => {
    const headers = buildCorsHeaders("https://evil.com");
    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("returns all expected CORS headers regardless of origin", () => {
    const headers = buildCorsHeaders(null);
    expect(headers["Access-Control-Allow-Methods"]).toBe(
      "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    );
    expect(headers["Access-Control-Allow-Headers"]).toBe(
      "Authorization, Content-Type, X-Requested-With",
    );
    expect(headers["Access-Control-Max-Age"]).toBe("86400");
  });
});

describe("corsHeaders", () => {
  it("returns CORS headers from request Origin header", () => {
    const req = new Request("http://localhost:3000/api/test", {
      headers: { Origin: "http://localhost:3000" },
    });
    const headers = corsHeaders(req);
    expect(headers).toHaveProperty("Access-Control-Allow-Methods");
    expect(headers).toHaveProperty("Access-Control-Allow-Headers");
  });
});

describe("handlePreflight", () => {
  it("returns 204 with CORS headers for localhost origin", () => {
    const req = new Request("http://localhost:3000/api/test", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
      },
    });
    const response = handlePreflight(req);
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBeTruthy();
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
  });

  it("returns 204 without origin reflection for disallowed origin", () => {
    const req = new Request("https://api.example.com/test", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.com" },
    });
    const response = handlePreflight(req);
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});