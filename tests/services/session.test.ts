import { describe, it, expect } from "vitest";
import { extractBearerToken } from "@/lib/auth/session";

describe("extractBearerToken", () => {
  it("extracts token from valid Bearer header", () => {
    const result = extractBearerToken("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    expect(result).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
  });

  it("handles lowercase bearer", () => {
    const result = extractBearerToken("bearer token123");
    expect(result).toBe("token123");
  });

  it("returns null for missing header", () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken("")).toBeNull();
  });

  it("returns null for malformed headers", () => {
    expect(extractBearerToken("Basic dXNlcjpwYXNz")).toBeNull();
    expect(extractBearerToken("Bearer")).toBeNull();
    expect(extractBearerToken("BearerTokenWithoutSpace")).toBeNull();
    expect(extractBearerToken("Bearer ")).toBeNull();
    expect(extractBearerToken("token-without-bearer")).toBeNull();
  });

  it("handles token with trailing whitespace", () => {
    const result = extractBearerToken("Bearer  token-with-trailing  ");
    expect(result).toBe("token-with-trailing");
  });
});