import { describe, it, expect } from "vitest";
import {
  isRequiredString,
  isEmail,
  isPositiveInt,
  isISODateString,
  isEnum,
  isFileContentType,
  isFileSizeBytes,
  runValidators,
  validateObject,
} from "@/lib/api/validation";

describe("isRequiredString", () => {
  it("returns null for a valid non-empty string", () => {
    expect(isRequiredString("hello")).toBeNull();
  });

  it("returns error for non-string values", () => {
    expect(isRequiredString(123)).toBe("Expected a string");
    expect(isRequiredString(null)).toBe("Expected a string");
    expect(isRequiredString(undefined)).toBe("Expected a string");
  });

  it("returns error for empty string", () => {
    expect(isRequiredString("")).toBe("Must be at least 1 character(s)");
  });

  it("respects minLength", () => {
    expect(isRequiredString("ab", 2)).toBeNull();
    expect(isRequiredString("a", 2)).toBe("Must be at least 2 character(s)");
  });

  it("respects maxLength", () => {
    expect(isRequiredString("abc", 1, 5)).toBeNull();
    expect(isRequiredString("abcdefgh", 1, 5)).toBe("Must be at most 5 characters");
  });
});

describe("isEmail", () => {
  it("returns null for valid emails", () => {
    expect(isEmail("user@example.com")).toBeNull();
    expect(isEmail("user+tag@example.org")).toBeNull();
    expect(isEmail("user@sub.example.co")).toBeNull();
  });

  it("returns error for invalid emails", () => {
    expect(isEmail("notanemail")).toBe("Invalid email address");
    expect(isEmail("missing@")).toBe("Invalid email address");
    expect(isEmail("@example.com")).toBe("Invalid email address");
    expect(isEmail("spaces in@email.com")).toBe("Invalid email address");
  });

  it("returns error for non-string values", () => {
    expect(isEmail(123)).toBe("Expected a string");
    expect(isEmail(null)).toBe("Expected a string");
  });
});

describe("isPositiveInt", () => {
  it("returns null for valid positive integers", () => {
    expect(isPositiveInt(1)).toBeNull();
    expect(isPositiveInt(100)).toBeNull();
  });

  it("returns error for non-integer numbers", () => {
    expect(isPositiveInt(1.5)).toBe("Expected an integer");
    expect(isPositiveInt(0.1)).toBe("Expected an integer");
  });

  it("returns error for non-number values", () => {
    expect(isPositiveInt("1")).toBe("Expected an integer");
    expect(isPositiveInt(null)).toBe("Expected an integer");
  });

  it("respects min boundary", () => {
    expect(isPositiveInt(5, 5)).toBeNull();
    expect(isPositiveInt(4, 5)).toBe("Must be at least 5");
  });

  it("respects max boundary", () => {
    expect(isPositiveInt(10, 1, 20)).toBeNull();
    expect(isPositiveInt(25, 1, 20)).toBe("Must be at most 20");
  });
});

describe("isISODateString", () => {
  it("returns null for valid ISO date strings", () => {
    expect(isISODateString("2026-05-08")).toBeNull();
    expect(isISODateString("2026-05-08T12:00:00Z")).toBeNull();
    expect(isISODateString("2026-12-31T23:59:59.123Z")).toBeNull();
  });

  it("returns error for invalid date strings", () => {
    expect(isISODateString("not-a-date")).toBe("Invalid date format; use ISO-8601 (e.g. 2026-05-08)");
    expect(isISODateString("2026-13-01")).toBe("Invalid date format; use ISO-8601 (e.g. 2026-05-08)");
    expect(isISODateString("")).toBe("Invalid date format; use ISO-8601 (e.g. 2026-05-08)");
  });

  it("returns error for non-string values", () => {
    expect(isISODateString(20260508)).toBe("Expected an ISO date string");
    expect(isISODateString(null)).toBe("Expected an ISO date string");
  });
});

describe("isEnum", () => {
  it("returns null when value is in enum", () => {
    expect(isEnum("admin", ["admin", "manager", "user"])).toBeNull();
    expect(isEnum("user", ["admin", "manager", "user"])).toBeNull();
  });

  it("returns error when value is not in enum", () => {
    expect(isEnum("superadmin", ["admin", "manager", "user"])).toBe(
      "Must be one of: admin, manager, user",
    );
  });

  it("returns error for non-string values", () => {
    expect(isEnum(123, ["admin", "manager"])).toBe("Expected a string");
  });
});

describe("isFileContentType", () => {
  it("returns null for allowed types", () => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    expect(isFileContentType("image/jpeg", allowed)).toBeNull();
    expect(isFileContentType("image/png", allowed)).toBeNull();
  });

  it("returns error for disallowed types", () => {
    const allowed = ["image/jpeg", "image/png"];
    expect(isFileContentType("application/pdf", allowed)).toBe(
      "Content-Type must be one of: image/jpeg, image/png",
    );
  });

  it("returns error for non-string values", () => {
    expect(isFileContentType(null, ["image/jpeg"])).toBe("Expected a string");
  });
});

describe("isFileSizeBytes", () => {
  it("returns null for valid file sizes", () => {
    expect(isFileSizeBytes(1024, 10_000_000)).toBeNull();
    expect(isFileSizeBytes(0, 10_000_000)).toBeNull();
  });

  it("returns error for negative sizes", () => {
    expect(isFileSizeBytes(-1, 10_000_000)).toBe("File size cannot be negative");
  });

  it("returns error when size exceeds max", () => {
    expect(isFileSizeBytes(11_000_000, 10_000_000)).toBe(
      "File size exceeds 10000000 bytes",
    );
  });

  it("returns error for non-number values", () => {
    expect(isFileSizeBytes("1000", 10_000_000)).toBe("Expected a number");
  });
});

describe("runValidators", () => {
  it("returns null when all validators pass", () => {
    const result = runValidators("user@example.com", isRequiredString, isEmail);
    expect(result).toBeNull();
  });

  it("returns first error message from failing validator", () => {
    const result = runValidators("", isRequiredString, isEmail);
    expect(result).toBe("Must be at least 1 character(s)");
  });
});

describe("validateObject", () => {
  it("returns empty object when all validations pass", () => {
    const obj = { email: "user@example.com", age: 25 };
    const result = validateObject(obj, {
      email: [isRequiredString, isEmail],
      age: [isPositiveInt],
    });
    expect(result).toEqual({});
  });

  it("returns errors for failed validations", () => {
    const obj = { email: "not-an-email", age: -5 };
    const result = validateObject(obj, {
      email: [isRequiredString, isEmail],
      age: [isPositiveInt],
    });
    expect(result).toHaveProperty("email");
    expect(result).toHaveProperty("age");
  });

  it("stops at first error per field", () => {
    const obj = { email: "" };
    const result = validateObject(obj, {
      email: [isRequiredString, isEmail],
    });
    expect(result["email"]).toBe("Must be at least 1 character(s)");
  });

  it("skips fields with no validators", () => {
    const obj = { name: "test", email: "bad" };
    const result = validateObject(obj, {
      email: [isEmail],
    });
    expect(result).toHaveProperty("email");
    expect(result).not.toHaveProperty("name");
  });
});