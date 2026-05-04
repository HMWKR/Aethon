"use server";

import {
  AI_CONTROL_MODES,
  AI_TASK_DEFAULTS,
  DEFAULT_AI_PREFERENCES,
  createDecisionAuditRecord,
  evaluateSuggestionGate,
  findProviderCapability,
  queueGenerationRunFromSuggestion,
  type AiControlMode,
  type AiControlPreferences,
  type AiDecisionAuditRecord,
  type AiSuggestionOption,
  type GenerationRun,
  type GenerationQueueDecision,
  type AiSuggestion,
  type ApprovalGateResult,
  type RiskCategory,
  type RiskFlag,
  type RiskSeverity,
  type SuggestionDecision
} from "@aethon/core";
import type { AiSuggestionRecord } from "@aethon/db";
import { createAiControlRepository } from "../lib/ai-control/repository";
import { requireAethonUserId } from "../lib/supabase/server";

type AiControlRepositoryInstance = Awaited<ReturnType<typeof createAiControlRepository>>;

export async function evaluateAiSuggestionAction(input: unknown): Promise<ApprovalGateResult> {
  const parsed = parseEvaluateAiSuggestionInput(input);

  return evaluateSuggestionGate(parsed.suggestion, parsed.preferences);
}

export async function recordAiSuggestionDecisionAction(input: unknown): Promise<AiDecisionAuditRecord> {
  const parsed = parseRecordAiSuggestionDecisionInput(input);
  const repository = parsed.persist ? await createAiControlRepository() : null;
  const userId = parsed.persist ? await requireAethonUserId() : null;
  const persistedSuggestion =
    repository && userId
      ? await loadPersistedSuggestion(repository, {
          suggestionId: parsed.suggestion.id,
          userId
        })
      : null;
  const suggestion = persistedSuggestion?.suggestion ?? parsed.suggestion;
  const preferences =
    repository && userId && persistedSuggestion
      ? await loadPersistedPreferences(repository, {
          projectId: persistedSuggestion.projectId,
          userId
        })
      : null;
  const gate = preferences
    ? evaluateSuggestionGate(suggestion, preferences)
    : parsed.gate;
  const auditRecord = createDecisionAuditRecord({
    decision: parsed.decision,
    decisionReason: parsed.decisionReason,
    gate,
    now: new Date(),
    suggestion
  });

  if (repository) {
    await repository.recordDecision({
      auditRecord,
      decisionReason: parsed.decisionReason
    });
  }

  return auditRecord;
}

export async function queueGenerationRunAction(input: unknown): Promise<GenerationQueueDecision> {
  const parsed = parseQueueGenerationRunInput(input);
  const userId = parsed.persist ? await requireAethonUserId() : "local-preview-user";
  const repository = parsed.persist ? await createAiControlRepository() : null;
  const persistedSuggestion = repository
    ? await loadPersistedSuggestion(repository, {
        projectId: parsed.projectId,
        suggestionId: parsed.suggestion.id,
        userId
      })
    : null;
  const preferences = repository
    ? await loadPersistedPreferences(repository, {
        projectId: parsed.projectId,
        userId
      })
    : parsed.preferences;
  const decision = queueGenerationRunFromSuggestion({
    id: crypto.randomUUID(),
    projectId: parsed.projectId,
    userId,
    suggestion: persistedSuggestion?.suggestion ?? parsed.suggestion,
    preferences,
    now: new Date()
  });

  if (repository && decision.run) {
    await upsertProviderCapabilityForRun(repository, parsed.projectId, decision.run);
    await repository.createGenerationRun({
      run: decision.run
    });
  }

  return decision;
}

export async function approveAndQueueGenerationRunAction(input: unknown): Promise<GenerationQueueDecision> {
  const parsed = parseApproveAndQueueGenerationRunInput(input);
  const userId = await requireAethonUserId();
  const repository = await createAiControlRepository();
  const persistedSuggestion = await loadPersistedSuggestion(repository, {
    projectId: parsed.projectId,
    suggestionId: parsed.suggestion.id,
    userId
  });
  const preferences = await loadPersistedPreferences(repository, {
    projectId: parsed.projectId,
    userId
  });
  const acceptedSuggestion: AiSuggestion = {
    ...persistedSuggestion.suggestion,
    decision: "accepted",
    decisionReason: parsed.decisionReason
  };
  const gate = evaluateSuggestionGate(acceptedSuggestion, preferences);
  const auditRecord = createDecisionAuditRecord({
    decision: "accepted",
    decisionReason: parsed.decisionReason,
    gate,
    now: new Date(),
    suggestion: acceptedSuggestion
  });

  const decision = queueGenerationRunFromSuggestion({
    id: crypto.randomUUID(),
    projectId: parsed.projectId,
    userId,
    suggestion: acceptedSuggestion,
    preferences,
    now: new Date()
  });

  if (decision.run) {
    await upsertProviderCapabilityForRun(repository, parsed.projectId, decision.run);
    await repository.recordDecisionAndCreateGenerationRun({
      auditRecord,
      decisionReason: parsed.decisionReason,
      run: decision.run
    });
  } else {
    await repository.recordDecision({
      auditRecord,
      decisionReason: parsed.decisionReason
    });
  }

  return decision;
}

interface EvaluateAiSuggestionInput {
  preferences: AiControlPreferences;
  suggestion: AiSuggestion;
}

interface RecordAiSuggestionDecisionInput {
  decision: Exclude<SuggestionDecision, "pending">;
  decisionReason: string;
  gate: ApprovalGateResult;
  persist?: boolean;
  suggestion: AiSuggestion;
}

interface QueueGenerationRunInput {
  preferences: AiControlPreferences;
  projectId: string;
  suggestion: AiSuggestion;
  persist?: boolean;
}

interface ApproveAndQueueGenerationRunInput {
  decisionReason: string;
  gate: ApprovalGateResult;
  preferences: AiControlPreferences;
  projectId: string;
  suggestion: AiSuggestion;
}

const AI_TASK_IDS = new Set(AI_TASK_DEFAULTS.map((task) => task.id));
const AI_CONTROL_MODE_SET = new Set<string>(AI_CONTROL_MODES);
const RISK_SEVERITIES = new Set<string>(["low", "medium", "high", "blocking"]);
const RISK_CATEGORIES = new Set<string>([
  "cost",
  "quality",
  "rights",
  "privacy",
  "provider",
  "consistency"
]);
const SUGGESTION_DECISIONS = new Set<string>([
  "pending",
  "accepted",
  "dismissed",
  "edited"
]);
const DECISION_INPUTS = new Set<string>(["accepted", "dismissed", "edited"]);
const GATE_STATUSES = new Set<string>(["ready", "requires-approval", "blocked"]);

function parseEvaluateAiSuggestionInput(input: unknown): EvaluateAiSuggestionInput {
  const record = requireRecord(input, "evaluateAiSuggestionAction input");

  return {
    preferences: parsePreferences(record.preferences),
    suggestion: parseSuggestion(record.suggestion)
  };
}

function parseRecordAiSuggestionDecisionInput(input: unknown): RecordAiSuggestionDecisionInput {
  const record = requireRecord(input, "recordAiSuggestionDecisionAction input");
  const decision = requireEnum(
    record.decision,
    DECISION_INPUTS,
    "decision"
  ) as Exclude<SuggestionDecision, "pending">;

  return {
    decision,
    decisionReason: requireString(record.decisionReason, "decisionReason"),
    gate: parseApprovalGate(record.gate),
    persist: record.persist === undefined ? undefined : requireBoolean(record.persist, "persist"),
    suggestion: parseSuggestion(record.suggestion)
  };
}

function parseQueueGenerationRunInput(input: unknown): QueueGenerationRunInput {
  const record = requireRecord(input, "queueGenerationRunAction input");

  return {
    preferences: parsePreferences(record.preferences),
    projectId: requireString(record.projectId, "projectId"),
    suggestion: parseSuggestion(record.suggestion),
    persist: record.persist === undefined ? undefined : requireBoolean(record.persist, "persist")
  };
}

function parseApproveAndQueueGenerationRunInput(
  input: unknown
): ApproveAndQueueGenerationRunInput {
  const record = requireRecord(input, "approveAndQueueGenerationRunAction input");

  return {
    decisionReason: requireString(record.decisionReason, "decisionReason"),
    gate: parseApprovalGate(record.gate),
    preferences: parsePreferences(record.preferences),
    projectId: requireString(record.projectId, "projectId"),
    suggestion: parseSuggestion(record.suggestion)
  };
}

async function loadPersistedSuggestion(
  repository: AiControlRepositoryInstance,
  input: {
    projectId?: string;
    suggestionId: string;
    userId: string;
  }
): Promise<{
  projectId: string;
  suggestion: AiSuggestion;
}> {
  const record = await repository.getSuggestion(input);

  if (!record) {
    throw new Error("Persisted AI suggestion was not found for the authenticated user.");
  }

  if (input.projectId && record.projectId !== input.projectId) {
    throw new Error("Persisted AI suggestion does not belong to the requested project.");
  }

  return {
    projectId: record.projectId,
    suggestion: suggestionFromRecord(record)
  };
}

async function loadPersistedPreferences(
  repository: AiControlRepositoryInstance,
  input: {
    projectId: string;
    userId: string;
  }
): Promise<AiControlPreferences> {
  return (await repository.getPreferences(input)) ?? DEFAULT_AI_PREFERENCES;
}

async function upsertProviderCapabilityForRun(
  repository: AiControlRepositoryInstance,
  projectId: string,
  run: GenerationRun
): Promise<void> {
  const capability = findProviderCapability(run.providerKey, run.modelKey);

  if (!capability || capability.id !== run.providerCapabilityId) {
    throw new Error("Generation run provider capability is not present in the server catalog.");
  }

  if (capability.pricingVersion !== run.pricingVersion) {
    throw new Error("Generation run pricing snapshot does not match the server catalog.");
  }

  await repository.upsertProviderCapability({
    projectId,
    capability
  });
}

function suggestionFromRecord(record: AiSuggestionRecord): AiSuggestion {
  return parseSuggestion({
    id: record.id,
    sceneId: record.sceneId,
    taskId: record.taskId,
    title: record.title,
    summary: record.summary,
    recommendedOptionId: record.recommendedOptionId,
    options: record.alternatives,
    riskFlags: record.riskFlags,
    decision: record.userDecision,
    decisionReason: record.decisionReason ?? undefined
  });
}

function parsePreferences(value: unknown): AiControlPreferences {
  const record = requireRecord(value, "preferences");
  const thresholdRecord = requireRecord(
    record.approvalThresholds,
    "preferences.approvalThresholds"
  );

  return {
    globalMode: parseMode(record.globalMode, "preferences.globalMode"),
    taskModes: parseTaskModes(record.taskModes),
    approvalThresholds: {
      maxAutoCostUsd: requireFiniteNonNegativeNumber(
        thresholdRecord.maxAutoCostUsd,
        "preferences.approvalThresholds.maxAutoCostUsd"
      ),
      manualApprovalRiskSeverity: requireEnum(
        thresholdRecord.manualApprovalRiskSeverity,
        RISK_SEVERITIES,
        "preferences.approvalThresholds.manualApprovalRiskSeverity"
      ) as RiskSeverity,
      externalProviderRequiresApproval: requireBoolean(
        thresholdRecord.externalProviderRequiresApproval,
        "preferences.approvalThresholds.externalProviderRequiresApproval"
      )
    }
  };
}

function parseTaskModes(value: unknown): AiControlPreferences["taskModes"] {
  if (value === undefined || value === null) {
    return {};
  }

  const record = requireRecord(value, "preferences.taskModes");
  const taskModes: AiControlPreferences["taskModes"] = {};

  for (const [taskId, mode] of Object.entries(record)) {
    if (!AI_TASK_IDS.has(taskId as (typeof AI_TASK_DEFAULTS)[number]["id"])) {
      throw new Error(`Invalid AI task mode key: ${taskId}`);
    }

    taskModes[taskId as keyof AiControlPreferences["taskModes"]] = parseMode(
      mode,
      `preferences.taskModes.${taskId}`
    );
  }

  return taskModes;
}

function parseSuggestion(value: unknown): AiSuggestion {
  const record = requireRecord(value, "suggestion");
  const options = requireArray(record.options, "suggestion.options").map((option, index) =>
    parseSuggestionOption(option, `suggestion.options[${index}]`)
  );
  const riskFlags = requireArray(record.riskFlags, "suggestion.riskFlags").map((risk, index) =>
    parseRiskFlag(risk, `suggestion.riskFlags[${index}]`)
  );
  const recommendedOptionId = requireString(
    record.recommendedOptionId,
    "suggestion.recommendedOptionId"
  );

  if (!options.some((option) => option.id === recommendedOptionId)) {
    throw new Error("suggestion.recommendedOptionId must match an option id.");
  }

  return {
    id: requireString(record.id, "suggestion.id"),
    sceneId: requireString(record.sceneId, "suggestion.sceneId"),
    taskId: requireTaskId(record.taskId, "suggestion.taskId"),
    title: requireString(record.title, "suggestion.title"),
    summary: requireString(record.summary, "suggestion.summary"),
    recommendedOptionId,
    options,
    riskFlags,
    decision: requireEnum(
      record.decision,
      SUGGESTION_DECISIONS,
      "suggestion.decision"
    ) as SuggestionDecision,
    decisionReason:
      record.decisionReason === undefined
        ? undefined
        : requireString(record.decisionReason, "suggestion.decisionReason")
  };
}

function parseSuggestionOption(value: unknown, path: string): AiSuggestionOption {
  const record = requireRecord(value, path);

  return {
    id: requireString(record.id, `${path}.id`),
    label: requireString(record.label, `${path}.label`),
    provider: requireString(record.provider, `${path}.provider`),
    model: requireString(record.model, `${path}.model`),
    estimatedCostUsd: requireFiniteNonNegativeNumber(
      record.estimatedCostUsd,
      `${path}.estimatedCostUsd`
    ),
    qualityScore: requireFiniteNonNegativeNumber(record.qualityScore, `${path}.qualityScore`),
    reason: requireString(record.reason, `${path}.reason`),
    tradeoffs: requireStringArray(record.tradeoffs, `${path}.tradeoffs`)
  };
}

function parseRiskFlag(value: unknown, path: string): RiskFlag {
  const record = requireRecord(value, path);

  return {
    id: requireString(record.id, `${path}.id`),
    category: requireEnum(record.category, RISK_CATEGORIES, `${path}.category`) as RiskCategory,
    severity: requireEnum(record.severity, RISK_SEVERITIES, `${path}.severity`) as RiskSeverity,
    label: requireString(record.label, `${path}.label`),
    detail: requireString(record.detail, `${path}.detail`),
    blocksAuto:
      record.blocksAuto === undefined
        ? undefined
        : requireBoolean(record.blocksAuto, `${path}.blocksAuto`)
  };
}

function parseApprovalGate(value: unknown): ApprovalGateResult {
  const record = requireRecord(value, "gate");

  return {
    status: requireEnum(record.status, GATE_STATUSES, "gate.status") as ApprovalGateResult["status"],
    effectiveMode: parseMode(record.effectiveMode, "gate.effectiveMode"),
    reasons: requireStringArray(record.reasons, "gate.reasons"),
    canExecute: requireBoolean(record.canExecute, "gate.canExecute"),
    requiresUserChoice: requireBoolean(record.requiresUserChoice, "gate.requiresUserChoice")
  };
}

function parseMode(value: unknown, path: string): AiControlMode {
  return requireEnum(value, AI_CONTROL_MODE_SET, path) as AiControlMode;
}

function requireTaskId(value: unknown, path: string): AiSuggestion["taskId"] {
  if (typeof value !== "string" || !AI_TASK_IDS.has(value as AiSuggestion["taskId"])) {
    throw new Error(`Invalid ${path}.`);
  }

  return value as AiSuggestion["taskId"];
}

function requireEnum(value: unknown, allowed: Set<string>, path: string): string {
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new Error(`Invalid ${path}.`);
  }

  return value;
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${path}.`);
  }

  return value as Record<string, unknown>;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${path}.`);
  }

  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid ${path}.`);
  }

  return value;
}

function requireFiniteNonNegativeNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${path}.`);
  }

  return value;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${path}.`);
  }

  return value;
}

function requireStringArray(value: unknown, path: string): string[] {
  return requireArray(value, path).map((entry, index) =>
    requireString(entry, `${path}[${index}]`)
  );
}
