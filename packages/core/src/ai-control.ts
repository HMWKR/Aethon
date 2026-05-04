export const AI_CONTROL_MODES = ["auto", "adviser", "off"] as const;

export type AiControlMode = (typeof AI_CONTROL_MODES)[number];

export type AiTaskId =
  | "model-selection"
  | "prompt-writing"
  | "consistency-check"
  | "partial-revision"
  | "cost-optimization"
  | "rights-check"
  | "export-qc";

export type RiskSeverity = "low" | "medium" | "high" | "blocking";

export type RiskCategory =
  | "cost"
  | "quality"
  | "rights"
  | "privacy"
  | "provider"
  | "consistency";

export type SuggestionDecision = "pending" | "accepted" | "dismissed" | "edited";

export type SceneStatus = "draft" | "needs-choice" | "adviser-review" | "approved";

export interface AiTaskPreference {
  id: AiTaskId;
  label: string;
  description: string;
  defaultMode: AiControlMode;
  requiresApproval: boolean;
}

export interface AiApprovalThresholds {
  /**
   * Default is intentionally zero: any paid/external generation should ask first
   * unless a user later raises this value in an explicit Auto policy.
   */
  maxAutoCostUsd: number;
  manualApprovalRiskSeverity: RiskSeverity;
  externalProviderRequiresApproval: boolean;
}

export interface AiControlPreferences {
  globalMode: AiControlMode;
  taskModes: Partial<Record<AiTaskId, AiControlMode>>;
  approvalThresholds: AiApprovalThresholds;
}

export interface RiskFlag {
  id: string;
  category: RiskCategory;
  severity: RiskSeverity;
  label: string;
  detail: string;
  blocksAuto?: boolean;
}

export interface AiSuggestionOption {
  id: string;
  label: string;
  provider: string;
  model: string;
  estimatedCostUsd: number;
  qualityScore: number;
  reason: string;
  tradeoffs: string[];
}

export interface AiSuggestion {
  id: string;
  sceneId: string;
  taskId: AiTaskId;
  title: string;
  summary: string;
  recommendedOptionId: string;
  options: AiSuggestionOption[];
  riskFlags: RiskFlag[];
  decision: SuggestionDecision;
  decisionReason?: string;
}

export interface ModelRecommendation {
  primary: string;
  alternatives: string[];
  reason: string;
  estimatedCostUsd: number;
  risk: string;
}

export interface SceneDecision {
  id: string;
  title: string;
  durationSeconds: number;
  status: SceneStatus;
  aiMode: AiControlMode;
  modelRecommendation: ModelRecommendation;
  consistencyScore: number;
}

export type ApprovalGateStatus = "ready" | "requires-approval" | "blocked";

export interface ApprovalGateResult {
  status: ApprovalGateStatus;
  effectiveMode: AiControlMode;
  reasons: string[];
  canExecute: boolean;
  requiresUserChoice: boolean;
}

export const AI_TASK_DEFAULTS: AiTaskPreference[] = [
  {
    id: "model-selection",
    label: "모델 선택",
    description: "씬 특성에 맞는 영상/이미지 모델 후보와 대체안을 비교합니다.",
    defaultMode: "adviser",
    requiresApproval: true
  },
  {
    id: "prompt-writing",
    label: "프롬프트 작성",
    description: "이미지/영상 프롬프트 후보를 만들고 누락 정보를 표시합니다.",
    defaultMode: "adviser",
    requiresApproval: true
  },
  {
    id: "consistency-check",
    label: "일관성 검사",
    description: "캐릭터, 배경, 스타일 점수를 자동 검사합니다.",
    defaultMode: "auto",
    requiresApproval: false
  },
  {
    id: "partial-revision",
    label: "부분수정 제안",
    description: "인라인 핀 댓글을 바탕으로 수정 후보와 영향 범위를 제안합니다.",
    defaultMode: "adviser",
    requiresApproval: true
  },
  {
    id: "cost-optimization",
    label: "비용 최적화",
    description: "고품질/저비용/빠른 대체 모델을 비교합니다.",
    defaultMode: "adviser",
    requiresApproval: true
  },
  {
    id: "rights-check",
    label: "권리/동의 체크",
    description: "레퍼런스, 실존 인물, 브랜드, provider 업로드 리스크를 검사합니다.",
    defaultMode: "auto",
    requiresApproval: true
  },
  {
    id: "export-qc",
    label: "최종 export QC",
    description: "블랙프레임, 무음, 누락 컷, 권리 manifest를 export 전에 확인합니다.",
    defaultMode: "auto",
    requiresApproval: true
  }
];

export const DEFAULT_AI_PREFERENCES: AiControlPreferences = {
  globalMode: "adviser",
  taskModes: Object.fromEntries(
    AI_TASK_DEFAULTS.map((task) => [task.id, task.defaultMode])
  ) as Record<AiTaskId, AiControlMode>,
  approvalThresholds: {
    maxAutoCostUsd: 0,
    manualApprovalRiskSeverity: "medium",
    externalProviderRequiresApproval: true
  }
};
