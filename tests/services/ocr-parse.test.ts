import { describe, it, expect } from "vitest";
import { parseStructured, parseOCRResponse } from "@/lib/ocr/parse";
import type { OCRStructured } from "@/types/scan";

describe("parseStructured", () => {
  it("parses valid JSON", () => {
    const json = JSON.stringify({
      title: "Test Document",
      fields: [{ field: "author", value: "John Doe" }],
      sizes: [{ size: "M", quantity: 2 }],
      notes: ["note one"],
    });
    const result = parseStructured(json);
    expect(result.title).toBe("Test Document");
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0]!.value).toBe("John Doe");
    expect(result.sizes[0]!.quantity).toBe(2);
  });

  it("extracts from markdown code block", () => {
    const raw = '```json\n{"title":"Doc","fields":[],"sizes":[]}\n```';
    const result = parseStructured(raw);
    expect(result.title).toBe("Doc");
  });

  it("falls back to raw text when JSON parse fails", () => {
    const raw = "This is not JSON at all";
    const result = parseStructured(raw);
    expect(result.rawText).toBeDefined();
  });

  it("handles missing optional fields", () => {
    const json = JSON.stringify({ fields: [], sizes: [] });
    const result = parseStructured(json);
    expect(result.title).toBeUndefined();
    expect(result.notes).toEqual([]);
  });

  it("normalizes malformed fields", () => {
    const json = JSON.stringify({
      fields: [
        { field: "size", value: "L", confidence: "high", category: "main" },
        { field: "color", value: "Blue", extra: "ignored" },
        null, // null item should be filtered
        "not an object",
      ],
      sizes: [
        { size: "XL", quantity: 1 },
        { size: "S", quantity: 3 },
        "invalid",
      ],
    });
    const result = parseStructured(json);
    expect(result.fields).toHaveLength(2);
    expect(result.fields[0]!.confidence).toBe("high");
    expect(result.sizes).toHaveLength(2);
    expect(result.sizes[1]!.quantity).toBe(3);
  });

  it("filters sizes with non-string size field", () => {
    const json = JSON.stringify({
      sizes: [{ size: 123, quantity: 1 }, { size: "M", quantity: 2 }],
    });
    const result = parseStructured(json);
    expect(result.sizes).toHaveLength(1);
    expect(result.sizes[0]!.size).toBe("M");
  });

  it("strips markdown code fences from bare JSON", () => {
    const raw = '```json\n{"title":"A","fields":[],"sizes":[]}\n```';
    const result = parseStructured(raw);
    expect(result.title).toBe("A");
  });
});

describe("parseOCRResponse", () => {
  it("returns ocrRaw from raw content", () => {
    const result = parseOCRResponse("Hello world", undefined, "claude-3.5-sonnet");
    expect(result.ocrRaw).toBe("Hello world");
  });

  it("extracts usage from OpenRouter response", () => {
    const result = parseOCRResponse(
      '{"title":"T","fields":[],"sizes":[]}',
      { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      "claude-3.5-sonnet",
    );
    expect(result.usage.input).toBe(100);
    expect(result.usage.output).toBe(50);
    expect(result.usage.total).toBe(150);
  });

  it("returns unknown model when not provided", () => {
    const result = parseOCRResponse("text", undefined, undefined);
    expect(result.model).toBe("unknown");
  });

  it("uses provided model name", () => {
    const result = parseOCRResponse("text", undefined, "claude-3.5-sonnet");
    expect(result.model).toBe("claude-3.5-sonnet");
  });

  it("handles undefined usage gracefully", () => {
    const result = parseOCRResponse("text", undefined, "model-x");
    expect(result.usage.input).toBe(0);
    expect(result.usage.output).toBe(0);
  });
});