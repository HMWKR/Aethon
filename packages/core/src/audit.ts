import type {
  AiSuggestion,
  ApprovalGateResult,
  SuggestionDecision
} from "./ai-control";
import { getRecommendedOption } from "./approval-gate";

export interface AiDecisionAuditRecord {
  id: string;
  suggestionId: string;
  sceneId: string;
  taskId: string;
  decision: Exclude<SuggestionDecision, "pending">;
  decisionReason: string;
  decidedAt: string;
  effectiveMode: ApprovalGateResult["effectiveMode"];
  gateStatus: ApprovalGateResult["status"];
  provider: string;
  model: string;
  estimatedCostUsd: number;
}

export function createDecisionAuditRecord({
  decision,
  decisionReason,
  gate,
  now,
  suggestion
}: {
  decision: Exclude<SuggestionDecision, "pending">;
  decisionReason: string;
  gate: ApprovalGateResult;
  now: Date;
  suggestion: AiSuggestion;
}): AiDecisionAuditRecord {
  const option = getRecommendedOption(suggestion);

  return {
    id: `${suggestion.id}:${decision}:${now.toISOString()}`,
    suggestionId: suggestion.id,
    sceneId: suggestion.sceneId,
    taskId: suggestion.taskId,
    decision,
    decisionReason,
    decidedAt: now.toISOString(),
    effectiveMode: gate.effectiveMode,
    gateStatus: gate.status,
    provider: option.provider,
    model: option.model,
    estimatedCostUsd: option.estimatedCostUsd
  };
}
