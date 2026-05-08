import { describe, it, expect } from "vitest";
import {
  calculateCost,
  estimateTokenCount,
  estimateCostFromInput,
  MODEL_TIER_COSTS,
} from "@/lib/ocr/token-usage";

describe("MODEL_TIER_COSTS", () => {
  it("has free, default, high tiers", () => {
    expect(MODEL_TIER_COSTS["free"]).toBeDefined();
    expect(MODEL_TIER_COSTS["default"]).toBeDefined();
    expect(MODEL_TIER_COSTS["high"]).toBeDefined();
  });

  it("free tier costs are zero", () => {
    const freeConfig = MODEL_TIER_COSTS["free"]!;
    expect(freeConfig.inputCostPerMillion).toBe(0);
    expect(freeConfig.outputCostPerMillion).toBe(0);
  });

  it("high tier costs more than default", () => {
    const highConfig = MODEL_TIER_COSTS["high"]!;
    const defaultConfig = MODEL_TIER_COSTS["default"]!;
    expect(highConfig.inputCostPerMillion).toBeGreaterThan(
      defaultConfig.inputCostPerMillion,
    );
    expect(highConfig.outputCostPerMillion).toBeGreaterThan(
      defaultConfig.outputCostPerMillion,
    );
  });
});

describe("calculateCost", () => {
  it("returns 0 for free tier", () => {
    const cost = calculateCost(1000, 500, "free");
    expect(cost).toBe(0);
  });

  it("calculates input + output for default tier", () => {
    const cost = calculateCost(1_000_000, 0, "default");
    expect(cost).toBe(0.5); // $0.5 per 1M input
  });

  it("calculates combined cost", () => {
    const cost = calculateCost(1_000_000, 1_000_000, "default");
    // $0.5 input + $1.5 output = $2.0
    expect(cost).toBe(2.0);
  });

  it("handles small token counts", () => {
    const cost = calculateCost(100, 50, "default");
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.001);
  });

  it("defaults to default tier when tier unknown", () => {
    const cost = calculateCost(100, 50, "unknown" as "default");
    expect(cost).toBe(calculateCost(100, 50, "default"));
  });

  it("high tier is more expensive", () => {
    const defaultCost = calculateCost(1000, 500, "default");
    const highCost = calculateCost(1000, 500, "high");
    expect(highCost).toBeGreaterThan(defaultCost);
  });
});

describe("estimateTokenCount", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokenCount("")).toBe(0);
  });

  it("estimates ~1 token per 4 characters", () => {
    expect(estimateTokenCount("a".repeat(4))).toBe(1);
    expect(estimateTokenCount("a".repeat(40))).toBe(10);
  });

  it("rounds up", () => {
    expect(estimateTokenCount("abc")).toBe(1); // ceil(3/4) = 1
    expect(estimateTokenCount("abcdefg")).toBe(2); // ceil(7/4) = 2
  });
});

describe("estimateCostFromInput", () => {
  it("returns 0 for free tier", () => {
    const cost = estimateCostFromInput(100_000, 100, "free");
    expect(cost).toBe(0);
  });

  it("returns positive cost for paid tiers", () => {
    const cost = estimateCostFromInput(1_000_000, 500, "default");
    expect(cost).toBeGreaterThan(0);
  });

  it("handles large inputs", () => {
    const cost = estimateCostFromInput(10_000_000, 10_000, "default");
    expect(cost).toBeGreaterThan(0);
  });
});