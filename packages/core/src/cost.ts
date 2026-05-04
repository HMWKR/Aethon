import type { AiSuggestion } from "./ai-control";
import { getRecommendedOption } from "./approval-gate";

export function sumRecommendedCost(suggestions: AiSuggestion[]): number {
  return suggestions.reduce(
    (sum, suggestion) => sum + getRecommendedOption(suggestion).estimatedCostUsd,
    0
  );
}

export function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}
