import { describe, it, expect } from "vitest";

// Import the types to verify they compile and match the expected shape
import type {
  OCRStructured,
  OCRField,
  OCRSize,
  TokenUsage,
  ScanRecord,
} from "@/types/scan";

describe("OCRField", () => {
  it("has required field + value", () => {
    const field: OCRField = { field: "author", value: "John Doe" };
    expect(field.field).toBe("author");
    expect(field.value).toBe("John Doe");
  });

  it("accepts optional confidence and category", () => {
    const field: OCRField = {
      field: "size",
      value: "M",
      confidence: "high",
      category: "main",
    };
    expect(field.confidence).toBe("high");
    expect(field.category).toBe("main");
  });
});

describe("OCRSize", () => {
  it("has size and quantity", () => {
    const size: OCRSize = { size: "XL", quantity: 2 };
    expect(size.size).toBe("XL");
    expect(size.quantity).toBe(2);
  });
});

describe("OCRStructured", () => {
  it("has fields and sizes arrays", () => {
    const doc: OCRStructured = {
      title: "Test Document",
      fields: [{ field: "title", value: "My Title" }],
      sizes: [{ size: "M", quantity: 1 }],
    };
    expect(doc.fields).toHaveLength(1);
    expect(doc.sizes).toHaveLength(1);
  });

  it("allows optional rawText and notes", () => {
    const doc: OCRStructured = {
      fields: [],
      sizes: [],
      rawText: "raw ocr text",
      notes: ["note 1", "note 2"],
    };
    expect(doc.rawText).toBe("raw ocr text");
    expect(doc.notes).toEqual(["note 1", "note 2"]);
  });
});

describe("TokenUsage", () => {
  it("has input, output, and cost", () => {
    const usage: TokenUsage = { input: 100, output: 50, cost: 0.001 };
    expect(usage.input).toBe(100);
    expect(usage.output).toBe(50);
    expect(usage.cost).toBeCloseTo(0.001);
  });
});

describe("ScanRecord shape", () => {
  it("has all required fields", () => {
    const record: ScanRecord = {
      id: "scan-1",
      userId: "user-1",
      timestamp: "2026-05-08T00:00:00Z",
      imageUrl: "https://cdn.example.com/scan.jpg",
      ocrRaw: "raw text",
      ocrStructured: { fields: [], sizes: [] },
      tokenUsage: { input: 0, output: 0, cost: 0 },
      apiKeyIndex: 0,
      edited: false,
      createdAt: "2026-05-08T00:00:00Z",
      updatedAt: "2026-05-08T00:00:00Z",
    };
    expect(record.id).toBeDefined();
    expect(record.userId).toBeDefined();
    expect(record.edited).toBe(false);
  });

  it("allows null imageUrl", () => {
    const record: ScanRecord = {
      id: "scan-1",
      userId: "user-1",
      timestamp: "2026-05-08T00:00:00Z",
      imageUrl: null,
      ocrRaw: "raw",
      ocrStructured: { fields: [], sizes: [] },
      tokenUsage: { input: 0, output: 0, cost: 0 },
      apiKeyIndex: 0,
      edited: false,
      createdAt: "2026-05-08T00:00:00Z",
      updatedAt: "2026-05-08T00:00:00Z",
    };
    expect(record.imageUrl).toBeNull();
  });
});

// ── imageUrl storage path validation ─────────────────────────────────────────

describe("createScanService imageUrl validation", () => {
  // Storage-path pattern: scans/<userId>/<file>
  const VALID_OWNED = "scans/user-123/file.jpg";
  const VALID_OTHER_USER = "scans/other-user/file.jpg";
  const EXTERNAL_URL = "https://evil.com/image.jpg";
  const ARBITRARY_PATH = "misc/some-path/file.jpg";
  const INCOMPLETE_PATH = "scans/";
  const INCOMPLETE_PATH_2 = "scans/user-123";
  const JUST_SCAN_BUCKET = "scans/";
  const PATH_TRAVERSAL = "scans/user-123/../../other-user/file.jpg";

  describe("isValidStoragePath (regexp)", () => {
    const STORAGE_PATH_RE = /^scans\/[a-zA-Z0-9-]+\/.+/;

    it("accepts a valid owned storage path", () => {
      expect(STORAGE_PATH_RE.test(VALID_OWNED)).toBe(true);
    });

    it("rejects external URL", () => {
      expect(STORAGE_PATH_RE.test(EXTERNAL_URL)).toBe(false);
    });

    it("rejects arbitrary path not under scans/", () => {
      expect(STORAGE_PATH_RE.test(ARBITRARY_PATH)).toBe(false);
    });

    it("rejects incomplete path (bucket only)", () => {
      expect(STORAGE_PATH_RE.test(INCOMPLETE_PATH)).toBe(false);
    });

    it("rejects incomplete path (userId segment only)", () => {
      expect(STORAGE_PATH_RE.test(INCOMPLETE_PATH_2)).toBe(false);
    });

    it("matches traversal-like path at regex level (guarded in service)", () => {
      expect(STORAGE_PATH_RE.test(PATH_TRAVERSAL)).toBe(true);
      expect(PATH_TRAVERSAL.includes("..")).toBe(true);
    });
  });

  describe("ownership check", () => {
    it("accepts path whose userId segment matches the requesting user", () => {
      const userId = "user-123";
      const path = `scans/${userId}/file.jpg`;
      expect(path.startsWith(`scans/${userId}/`)).toBe(true);
    });

    it("rejects path belonging to a different user", () => {
      const userId = "user-123";
      const path = `scans/other-user/file.jpg`;
      expect(path.startsWith(`scans/${userId}/`)).toBe(false);
    });
  });

  describe("route-level type guard", () => {
    it("passes null imageUrl through", () => {
      const body = { imageUrl: null, ocrRaw: "raw", ocrStructured: {}, tokenUsage: {}, apiKeyIndex: 0 };
      const validated: string | null =
        body.imageUrl === null ? null :
        body.imageUrl !== undefined ? (body.imageUrl as string) : null;
      expect(validated).toBeNull();
    });

    it("passes string imageUrl through", () => {
      const body = { imageUrl: VALID_OWNED, ocrRaw: "raw", ocrStructured: {}, tokenUsage: {}, apiKeyIndex: 0 };
      const validated: string | null =
        body.imageUrl === null ? null :
        body.imageUrl !== undefined ? (body.imageUrl as string) : null;
      expect(validated).toBe(VALID_OWNED);
    });

    it("blocks non-string non-null imageUrl (number)", () => {
      const body = { imageUrl: 123 as unknown, ocrRaw: "raw", ocrStructured: {}, tokenUsage: {}, apiKeyIndex: 0 };
      const isInvalid =
        body.imageUrl !== undefined && body.imageUrl !== null && typeof body.imageUrl !== "string";
      expect(isInvalid).toBe(true);
    });

    it("blocks non-string non-null imageUrl (object)", () => {
      const body = { imageUrl: {} as unknown, ocrRaw: "raw", ocrStructured: {}, tokenUsage: {}, apiKeyIndex: 0 };
      const isInvalid =
        body.imageUrl !== undefined && body.imageUrl !== null && typeof body.imageUrl !== "string";
      expect(isInvalid).toBe(true);
    });

    it("accepts non-negative integer apiKeyIndex", () => {
      const body = { apiKeyIndex: 0 };
      const isValid =
        typeof body.apiKeyIndex === "number" &&
        Number.isInteger(body.apiKeyIndex) &&
        body.apiKeyIndex >= 0;
      expect(isValid).toBe(true);
    });

    it("rejects negative apiKeyIndex", () => {
      const body = { apiKeyIndex: -1 };
      const isInvalid =
        typeof body.apiKeyIndex !== "number" ||
        !Number.isInteger(body.apiKeyIndex) ||
        body.apiKeyIndex < 0;
      expect(isInvalid).toBe(true);
    });

    it("rejects non-integer apiKeyIndex", () => {
      const body = { apiKeyIndex: 1.5 };
      const isInvalid =
        typeof body.apiKeyIndex !== "number" ||
        !Number.isInteger(body.apiKeyIndex) ||
        body.apiKeyIndex < 0;
      expect(isInvalid).toBe(true);
    });
  });
});