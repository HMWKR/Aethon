import type {
  AiSuggestion,
  AiSuggestionOption,
  ApprovalGateResult,
  RiskFlag,
  RiskSeverity
} from "./ai-control";
import { resolveTaskMode } from "./ai-policy";
import type { AiControlPreferences } from "./ai-control";

export const RISK_SEVERITY_RANK: Record<RiskSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  blocking: 4
};

export function evaluateSuggestionGate(
  suggestion: AiSuggestion,
  preferences: AiControlPreferences
): ApprovalGateResult {
  const effectiveMode = resolveTaskMode(preferences, suggestion.taskId);

  if (effectiveMode === "off") {
    return {
      status: "blocked",
      effectiveMode,
      reasons: ["이 작업의 AI 제안이 Off로 설정되어 있습니다."],
      canExecute: false,
      requiresUserChoice: false
    };
  }

  const reasons: string[] = [];
  const recommendedOption = getRecommendedOption(suggestion);
  const threshold = preferences.approvalThresholds;

  if (effectiveMode === "adviser") {
    reasons.push("Adviser Mode에서는 실행 전 사용자 선택이 필요합니다.");
  }

  if (recommendedOption.estimatedCostUsd > threshold.maxAutoCostUsd) {
    reasons.push(
      `예상 비용 $${recommendedOption.estimatedCostUsd.toFixed(2)}가 자동 실행 임계값 $${threshold.maxAutoCostUsd.toFixed(2)}를 초과합니다.`
    );
  }

  const highestRisk = getHighestRiskSeverity(suggestion.riskFlags);
  if (
    highestRisk &&
    RISK_SEVERITY_RANK[highestRisk] >=
      RISK_SEVERITY_RANK[threshold.manualApprovalRiskSeverity]
  ) {
    reasons.push(`${highestRisk.toUpperCase()} 리스크가 있어 승인 게이트가 필요합니다.`);
  }

  if (threshold.externalProviderRequiresApproval && recommendedOption.provider !== "local") {
    reasons.push(`${recommendedOption.provider} 외부 provider 호출 전 확인이 필요합니다.`);
  }

  if (suggestion.riskFlags.some((risk) => risk.blocksAuto || risk.severity === "blocking")) {
    reasons.push("자동 실행을 막는 리스크가 포함되어 있습니다.");
  }

  if (reasons.length > 0) {
    return {
      status: "requires-approval",
      effectiveMode,
      reasons,
      canExecute: true,
      requiresUserChoice: true
    };
  }

  return {
    status: "ready",
    effectiveMode,
    reasons: ["명시된 Auto 정책 안에서 실행 가능합니다."],
    canExecute: true,
    requiresUserChoice: false
  };
}

export function getRecommendedOption(suggestion: AiSuggestion): AiSuggestionOption {
  return (
    suggestion.options.find((option) => option.id === suggestion.recommendedOptionId) ??
    suggestion.options[0]
  );
}

export function getHighestRiskSeverity(riskFlags: RiskFlag[]): RiskSeverity | undefined {
  return riskFlags.reduce<RiskSeverity | undefined>((highest, current) => {
    if (!highest) {
      return current.severity;
    }

    return RISK_SEVERITY_RANK[current.severity] > RISK_SEVERITY_RANK[highest]
      ? current.severity
      : highest;
  }, undefined);
}
