/**
 * Token usage and cost calculation for OpenRouter API calls.
 *
 * Pricing model (approximate, update as needed):
 *   Model tier → { input cost per 1M tokens, output cost per 1M tokens }
 *
 * Costs are calculated in USD.
 */

export interface TokenCostConfig {
  inputCostPerMillion: number;
  outputCostPerMillion: number;
}

/**
 * Pricing for each model tier.
 * Values are approximate USD per 1M tokens.
 */
export const MODEL_TIER_COSTS: Record<string, TokenCostConfig> = {
  free: { inputCostPerMillion: 0, outputCostPerMillion: 0 },
  default: { inputCostPerMillion: 0.5, outputCostPerMillion: 1.5 },
  high: { inputCostPerMillion: 3.0, outputCostPerMillion: 15.0 },
};

/**
 * Calculate total cost in USD given input and output token counts.
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  tier: keyof typeof MODEL_TIER_COSTS = "default",
): number {
  const config = MODEL_TIER_COSTS[tier] ?? MODEL_TIER_COSTS["default"]!;
  const inputCost = (inputTokens / 1_000_000) * config.inputCostPerMillion;
  const outputCost = (outputTokens / 1_000_000) * config.outputCostPerMillion;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimal places
}

/**
 * Estimate token count from raw text.
 * Rough heuristic: ~4 characters per token for typical English text.
 * OpenRouter reports actual usage in the response; this is for pre-call estimation.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Rough approximation: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
}

/**
 * Estimate total cost from raw image size and text length.
 * Used to show approximate cost before the API call returns usage data.
 */
export function estimateCostFromInput(
  imageBase64SizeBytes: number,
  ocrRawLength: number,
  tier: keyof typeof MODEL_TIER_COSTS = "default",
): number {
  const estimatedInputTokens = Math.ceil(imageBase64SizeBytes / 4); // rough
  const estimatedText = "x".repeat(Math.min(ocrRawLength, 10000)); // cap to avoid huge strings
  const estimatedOutputTokens = estimateTokenCount(estimatedText);
  return calculateCost(estimatedInputTokens, estimatedOutputTokens, tier ?? "default");
}