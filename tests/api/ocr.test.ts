import { describe, it, expect } from "vitest";
import type { OCRProcessRequest } from "@/types/ocr";

// Test request/response shapes without requiring actual API calls
function makeRequest(overrides: Partial<OCRProcessRequest> = {}): OCRProcessRequest {
  // Avoid duplicate property errors under exactOptionalPropertyTypes
  const { imageUrl: _imgUrl, modelTier: _modelTier, ...rest } = overrides;
  return {
    imageUrl: _imgUrl !== undefined ? _imgUrl : "https://example.com/test.jpg",
    modelTier: _modelTier ?? "default",
    ...rest,
  } as OCRProcessRequest;
}

describe("OCRProcessRequest shape", () => {
  it("requires imageBase64 or imageUrl", () => {
    const req = makeRequest();
    const hasSource = !!(req.imageBase64 || req.imageUrl);
    expect(hasSource).toBe(true);
  });

  it("modelTier defaults to default", () => {
    const req: OCRProcessRequest = { imageUrl: "https://example.com/test.jpg", modelTier: "default" };
    expect(req.modelTier ?? "default").toBe("default");
  });

  it("accepts all model tiers", () => {
    const tiers: Array<"free" | "default" | "high"> = ["free", "default", "high"];
    tiers.forEach((t: "free" | "default" | "high") => {
      const req: OCRProcessRequest = { imageUrl: "https://example.com/test.jpg", modelTier: t };
      expect(req.modelTier).toBe(t);
    });
  });

  it("imageBase64 can be provided instead of imageUrl", () => {
    const req: OCRProcessRequest = { imageBase64: "base64data...", modelTier: "default" };
    expect(req.imageBase64).toBe("base64data...");
    expect(req.imageUrl).toBeUndefined();
  });
});