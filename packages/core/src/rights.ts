import type { AiSuggestion, RiskFlag } from "./ai-control";

const rightsCategories = new Set<RiskFlag["category"]>(["rights", "privacy"]);

export function isRightsRisk(risk: RiskFlag): boolean {
  return rightsCategories.has(risk.category);
}

export function countRightsIssues(suggestions: AiSuggestion[]): number {
  return suggestions.reduce(
    (sum, suggestion) => sum + suggestion.riskFlags.filter(isRightsRisk).length,
    0
  );
}
