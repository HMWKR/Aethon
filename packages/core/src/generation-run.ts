import type {
  AiControlMode,
  AiControlPreferences,
  AiSuggestion,
  ApprovalGateResult
} from "./ai-control";
import { evaluateSuggestionGate, getRecommendedOption } from "./approval-gate";
import {
  findProviderCapability,
  validateProviderCatalogSelection
} from "./production-readiness";

export const GENERATION_RUN_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled"
] as const;

export type GenerationRunStatus = (typeof GENERATION_RUN_STATUSES)[number];

export const GENERATION_RUN_EVENT_TYPES = [
  "queued",
  "claimed",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "retry-scheduled"
] as const;

export type GenerationRunEventType = (typeof GENERATION_RUN_EVENT_TYPES)[number];

export type GenerationRunTriggerSource =
  | "approved-suggestion"
  | "auto-policy"
  | "manual-override";

export interface GenerationRunAuditEvent {
  status: GenerationRunStatus;
  at: string;
  actorId: string;
  reason: string;
}

export interface GenerationRunEvent {
  id: string;
  projectId: string;
  runId: string;
  sceneId: string;
  type: GenerationRunEventType;
  status: GenerationRunStatus;
  at: string;
  actorId: string;
  reason: string;
  providerJobId: string | null;
  outputAssetId: string | null;
  failureReason: string | null;
  retryCount: number;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  claimToken: string | null;
  metadata: Record<string, string | number | boolean | null>;
}

export interface GenerationRun {
  id: string;
  projectId: string;
  sceneId: string;
  suggestionId: string | null;
  userId: string;
  providerCapabilityId: string;
  providerKey: string;
  modelKey: string;
  provider: string;
  model: string;
  pricingVersion: string;
  providerTermsUrl: string;
  providerCapabilityVerifiedAtIso: string;
  promptHash: string | null;
  inputAssetIds: string[];
  outputAssetId: string | null;
  costEstimateUsd: number | null;
  status: GenerationRunStatus;
  triggerMode: AiControlMode;
  triggerSource: GenerationRunTriggerSource;
  providerJobId: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  claimToken: string | null;
  claimedAt: string | null;
  retryCount: number;
  maxRetries: number;
  failureReason: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  auditTrail: GenerationRunAuditEvent[];
}

export interface QueueGenerationRunInput {
  id: string;
  projectId: string;
  userId: string;
  suggestion: AiSuggestion;
  preferences: AiControlPreferences;
  now: Date;
  promptHash?: string;
  inputAssetIds?: string[];
  maxRetries?: number;
}

export type GenerationQueueDecisionStatus =
  | "queued"
  | "requires-approval"
  | "blocked";

export interface GenerationQueueDecision {
  status: GenerationQueueDecisionStatus;
  gate: ApprovalGateResult;
  reasons: string[];
  run: GenerationRun | null;
}

export type GenerationRunClaimStatus = "claimed" | "blocked";

export interface GenerationRunClaimDecision {
  status: GenerationRunClaimStatus;
  reasons: string[];
  run: GenerationRun | null;
  event: GenerationRunEvent | null;
}

const VALID_STATUS_TRANSITIONS: Record<GenerationRunStatus, GenerationRunStatus[]> = {
  queued: ["failed", "cancelled"],
  running: ["succeeded", "failed", "cancelled"],
  succeeded: [],
  failed: ["queued", "cancelled"],
  cancelled: []
};

export function canTransitionGenerationRun(
  from: GenerationRunStatus,
  to: GenerationRunStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to);
}

export function queueGenerationRunFromSuggestion(
  input: QueueGenerationRunInput
): GenerationQueueDecision {
  const gate = evaluateSuggestionGate(input.suggestion, input.preferences);
  const option = getRecommendedOption(input.suggestion);
  const nowIso = input.now.toISOString();
  const providerIssues = validateProviderCatalogSelection({
    provider: option.provider,
    model: option.model,
    nowIso
  });
  const providerBlockers = providerIssues.filter((issue) => issue.severity === "blocking");
  const providerWarnings = providerIssues.filter((issue) => issue.severity !== "blocking");
  const capability = findProviderCapability(option.provider, option.model);

  if (gate.status === "blocked") {
    return {
      status: "blocked",
      gate,
      reasons: gate.reasons,
      run: null
    };
  }

  if (providerBlockers.length > 0 || !capability) {
    return {
      status: "blocked",
      gate,
      reasons: providerIssues.map((issue) => issue.detail),
      run: null
    };
  }

  if (
    gate.requiresUserChoice &&
    input.suggestion.decision !== "accepted" &&
    input.suggestion.decision !== "edited"
  ) {
    return {
      status: "requires-approval",
      gate,
      reasons: gate.reasons,
      run: null
    };
  }

  if (input.suggestion.decision === "dismissed") {
    return {
      status: "blocked",
      gate,
      reasons: ["The user dismissed this suggestion, so no generation run can be queued."],
      run: null
    };
  }

  const queuedAt = nowIso;
  const triggerSource: GenerationRunTriggerSource =
    input.suggestion.decision === "accepted" || input.suggestion.decision === "edited"
      ? "approved-suggestion"
      : "auto-policy";

  return {
    status: "queued",
    gate,
    reasons:
      triggerSource === "auto-policy"
        ? [
            "The suggestion is inside the explicit Auto policy and can be queued.",
            ...providerWarnings.map((issue) => issue.detail)
          ]
        : [
            "The user decision authorizes this generation run.",
            ...providerWarnings.map((issue) => issue.detail)
          ],
    run: {
      id: input.id,
      projectId: input.projectId,
      sceneId: input.suggestion.sceneId,
      suggestionId: input.suggestion.id,
      userId: input.userId,
      providerCapabilityId: capability.id,
      providerKey: capability.providerKey,
      modelKey: capability.modelKey,
      provider: capability.provider,
      model: capability.model,
      pricingVersion: capability.pricingVersion,
      providerTermsUrl: capability.providerTermsUrl,
      providerCapabilityVerifiedAtIso: capability.lastVerifiedAtIso,
      promptHash: input.promptHash ?? null,
      inputAssetIds: input.inputAssetIds ?? [],
      outputAssetId: null,
      costEstimateUsd: option.estimatedCostUsd,
      status: "queued",
      triggerMode: gate.effectiveMode,
      triggerSource,
      providerJobId: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      claimToken: null,
      claimedAt: null,
      retryCount: 0,
      maxRetries: input.maxRetries ?? 2,
      failureReason: null,
      queuedAt,
      startedAt: null,
      completedAt: null,
      updatedAt: queuedAt,
      auditTrail: [
        {
          status: "queued",
          at: queuedAt,
          actorId: input.userId,
          reason:
            triggerSource === "auto-policy"
              ? "Queued by explicit Auto policy."
              : "Queued after user approval."
        }
      ]
    }
  };
}

export function createGenerationRunEvent(input: {
  id: string;
  run: GenerationRun;
  type: GenerationRunEventType;
  at: Date;
  actorId: string;
  reason: string;
  metadata?: Record<string, string | number | boolean | null>;
}): GenerationRunEvent {
  return {
    id: input.id,
    projectId: input.run.projectId,
    runId: input.run.id,
    sceneId: input.run.sceneId,
    type: input.type,
    status: input.run.status,
    at: input.at.toISOString(),
    actorId: input.actorId,
    reason: input.reason,
    providerJobId: input.run.providerJobId,
    outputAssetId: input.run.outputAssetId,
    failureReason: input.run.failureReason,
    retryCount: input.run.retryCount,
    leaseOwner: input.run.leaseOwner,
    leaseExpiresAt: input.run.leaseExpiresAt,
    claimToken: input.run.claimToken,
    metadata: input.metadata ?? {}
  };
}

export function hasActiveGenerationRunLease(
  run: GenerationRun,
  now: Date,
  actorId?: string
): boolean {
  if (!run.leaseOwner || !run.leaseExpiresAt) {
    return false;
  }

  if (actorId && run.leaseOwner !== actorId) {
    return false;
  }

  return Date.parse(run.leaseExpiresAt) > now.getTime();
}

export function claimGenerationRun(input: {
  id: string;
  run: GenerationRun;
  now: Date;
  actorId: string;
  claimToken: string;
  leaseSeconds: number;
  reason: string;
}): GenerationRunClaimDecision {
  if (input.leaseSeconds <= 0 || !Number.isFinite(input.leaseSeconds)) {
    throw new Error("Generation run lease duration must be positive.");
  }

  const canClaimStatus = input.run.status === "queued" || input.run.status === "running";

  if (!canClaimStatus) {
    return {
      status: "blocked",
      reasons: [`Generation run ${input.run.id} is ${input.run.status} and cannot be claimed.`],
      run: null,
      event: null
    };
  }

  if (hasActiveGenerationRunLease(input.run, input.now)) {
    if (
      input.run.leaseOwner === input.actorId &&
      input.run.claimToken === input.claimToken
    ) {
      return {
        status: "claimed",
        reasons: ["Generation run lease claim is idempotent."],
        run: input.run,
        event: null
      };
    }

    return {
      status: "blocked",
      reasons: [`Generation run ${input.run.id} already has an active lease.`],
      run: null,
      event: null
    };
  }

  const claimedAt = input.now.toISOString();
  const leaseExpiresAt = new Date(
    input.now.getTime() + input.leaseSeconds * 1000
  ).toISOString();
  const nextRun: GenerationRun = {
    ...input.run,
    status: "running",
    leaseOwner: input.actorId,
    leaseExpiresAt,
    claimToken: input.claimToken,
    claimedAt,
    startedAt: input.run.startedAt ?? claimedAt,
    updatedAt: claimedAt,
    auditTrail: [
      ...input.run.auditTrail,
      {
        status: "running",
        at: claimedAt,
        actorId: input.actorId,
        reason: input.reason
      }
    ]
  };

  return {
    status: "claimed",
    reasons: ["Generation run lease claimed."],
    run: nextRun,
    event: createGenerationRunEvent({
      id: input.id,
      run: nextRun,
      type: "claimed",
      at: input.now,
      actorId: input.actorId,
      reason: input.reason,
      metadata: {
        leaseSeconds: input.leaseSeconds
      }
    })
  };
}

export function transitionGenerationRun(input: {
  run: GenerationRun;
  to: GenerationRunStatus;
  now: Date;
  actorId: string;
  reason: string;
  providerJobId?: string;
  outputAssetId?: string;
  failureReason?: string;
}): GenerationRun {
  if (!canTransitionGenerationRun(input.run.status, input.to)) {
    throw new Error(
      `Invalid generation run transition: ${input.run.status} -> ${input.to}`
    );
  }

  if (
    input.run.status === "running" &&
    (input.to === "succeeded" || input.to === "failed") &&
    !hasActiveGenerationRunLease(input.run, input.now, input.actorId)
  ) {
    throw new Error("A running generation run needs an active worker lease for terminal transitions.");
  }

  if (input.to === "failed" && !input.failureReason && !input.reason) {
    throw new Error("A failed generation run needs a failure reason.");
  }

  if (input.to === "succeeded" && !input.outputAssetId) {
    throw new Error("A succeeded generation run needs an output asset id.");
  }

  if (input.to === "queued" && input.run.retryCount >= input.run.maxRetries) {
    throw new Error("Generation run retry limit exceeded.");
  }

  const at = input.now.toISOString();
  const retryCount =
    input.run.status === "failed" && input.to === "queued"
      ? input.run.retryCount + 1
      : input.run.retryCount;
  const shouldClearLease =
    input.to === "queued" ||
    input.to === "succeeded" ||
    input.to === "failed" ||
    input.to === "cancelled";

  return {
    ...input.run,
    status: input.to,
    providerJobId: input.providerJobId ?? input.run.providerJobId,
    outputAssetId: input.outputAssetId ?? input.run.outputAssetId,
    retryCount,
    failureReason:
      input.to === "failed"
        ? input.failureReason ?? input.reason
        : input.to === "queued"
          ? null
          : input.run.failureReason,
    startedAt: input.to === "running" ? at : input.run.startedAt,
    completedAt:
      input.to === "succeeded" || input.to === "failed" || input.to === "cancelled"
        ? at
        : input.to === "queued"
          ? null
          : input.run.completedAt,
    updatedAt: at,
    leaseOwner: shouldClearLease ? null : input.run.leaseOwner,
    leaseExpiresAt: shouldClearLease ? null : input.run.leaseExpiresAt,
    claimToken: shouldClearLease ? null : input.run.claimToken,
    claimedAt: shouldClearLease ? null : input.run.claimedAt,
    auditTrail: [
      ...input.run.auditTrail,
      {
        status: input.to,
        at,
        actorId: input.actorId,
        reason: input.reason
      }
    ]
  };
}
