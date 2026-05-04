import type {
  BudgetPriority,
  CameraAngle,
  SceneEmotion,
  SceneSpec,
  ShotType
} from "@aethon/core";
import {
  composePromptPair,
  lintPromptPair,
  type PromptLintIssue,
  type PromptPair
} from "./prompt-engine";

export interface ScenePlannerInput {
  projectId: string;
  requestedBy: string;
  brief: string;
  targetSceneCount?: number;
  targetDurationSeconds?: number;
  characters?: string[];
  background?: string;
  style?: string;
  aspectRatio?: string;
  nowIso?: string;
}

export interface PlannedSceneSuggestion {
  id: string;
  order: number;
  title: string;
  summary: string;
  durationSeconds: number;
  approvalStatus: "pending";
  sceneSpec: SceneSpec;
  promptPair: PromptPair;
  missingInformation: string[];
  alternatives: string[];
  promptIssues: PromptLintIssue[];
}

export interface ScenePlanResult {
  projectId: string;
  generatedAtIso: string;
  scenes: PlannedSceneSuggestion[];
  missingInformation: string[];
}

const CAMERA_PATTERN: CameraAngle[] = [
  "wide",
  "tracking",
  "medium",
  "close-up",
  "over-shoulder",
  "low-angle",
  "high-angle"
];

const SHOT_PATTERN: ShotType[] = [
  "establishing",
  "action",
  "reaction",
  "insert",
  "transition",
  "manual-cut"
];

export function planScenes(input: ScenePlannerInput): ScenePlanResult {
  const targetSceneCount = clampInteger(input.targetSceneCount ?? 8, 1, 35);
  const generatedAtIso = input.nowIso ?? "2026-05-04T00:00:00.000Z";
  const totalDuration = Math.max(input.targetDurationSeconds ?? targetSceneCount * 6, targetSceneCount);
  const durationSeconds = Math.round((totalDuration / targetSceneCount) * 10) / 10;
  const beats = getBeats(input.brief, targetSceneCount);
  const missingInformation = getMissingInformation(input);

  return {
    projectId: input.projectId,
    generatedAtIso,
    missingInformation,
    scenes: beats.map((beat, index) =>
      createSceneSuggestion({
        input,
        beat,
        index,
        durationSeconds,
        generatedAtIso,
        missingInformation
      })
    )
  };
}

function createSceneSuggestion({
  input,
  beat,
  index,
  durationSeconds,
  generatedAtIso,
  missingInformation
}: {
  input: ScenePlannerInput;
  beat: string;
  index: number;
  durationSeconds: number;
  generatedAtIso: string;
  missingInformation: string[];
}): PlannedSceneSuggestion {
  const sceneNumber = index + 1;
  const sceneId = `scene-${String(sceneNumber).padStart(2, "0")}`;
  const emotion = inferEmotion(beat);
  const shotType = SHOT_PATTERN[index % SHOT_PATTERN.length]!;
  const cameraAngle = CAMERA_PATTERN[index % CAMERA_PATTERN.length]!;
  const budgetPriority = inferBudgetPriority(beat, sceneNumber);
  const promptPair = composePromptPair({
    intent: beat,
    characters: input.characters ?? [],
    background: input.background ?? "",
    style: input.style ?? "",
    continuity: [
      "match character identity across scenes",
      "keep world bible details stable",
      "preserve scene-to-scene lighting logic"
    ],
    camera: cameraAngle,
    mood: emotion,
    durationSeconds,
    shotType
  });

  const sceneSpec: SceneSpec = {
    id: `spec-${sceneId}`,
    sceneId,
    userIntent: beat,
    requestedBy: input.requestedBy,
    decisionId: null,
    approvalPolicy: {
      requiresEditorApproval: true,
      maxApprovedCostUsd: 0,
      externalProviderAllowed: false
    },
    cameraAngle,
    emotion,
    shotType,
    budgetPriority,
    isHighlight: budgetPriority === "quality-first",
    targetAspectRatio: input.aspectRatio ?? "16:9",
    providerInputMode: "text-to-video",
    imagePrompt: promptPair.imagePrompt,
    videoPrompt: promptPair.videoPrompt,
    imageModel: "ideogram",
    videoModel: "runway-gen-4-turbo",
    selectionMode: "ai-advised",
    sourceAssetIds: [],
    referenceAssetIds: [],
    constraints: {
      rights: ["editor must confirm source rights before external generation"],
      safety: ["no paid provider call before approval"],
      continuity: ["keep prompt elements and continuity locks visible"]
    },
    continuityLocks: {
      character: input.characters?.length ? 80 : 50,
      background: input.background ? 80 : 50,
      style: input.style ? 80 : 50
    },
    createdAtIso: generatedAtIso,
    updatedAtIso: generatedAtIso
  };

  return {
    id: `suggestion-${sceneId}`,
    order: sceneNumber,
    title: `Scene ${sceneNumber}`,
    summary: beat,
    durationSeconds,
    approvalStatus: "pending",
    sceneSpec,
    promptPair,
    missingInformation,
    alternatives: [
      "Use a lower-cost draft model before the hero pass.",
      "Request an editor reference frame before queueing external generation."
    ],
    promptIssues: lintPromptPair(promptPair)
  };
}

function getBeats(brief: string, targetSceneCount: number): string[] {
  const sentences = brief
    .split(/(?<=[.!?])\s+|\n+/)
    .map((entry) => entry.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const source = sentences.length > 0 ? sentences : ["Define the scene intent before generation."];

  return Array.from({ length: targetSceneCount }, (_, index) => {
    const base = source[index % source.length]!;
    const beatNumber = index + 1;

    return source.length >= targetSceneCount
      ? base
      : `${base} Beat ${beatNumber} advances the edit with a distinct visual decision.`;
  });
}

function getMissingInformation(input: ScenePlannerInput): string[] {
  const missing: string[] = [];

  if (!input.characters?.length) {
    missing.push("character bible");
  }

  if (!input.background?.trim()) {
    missing.push("background card");
  }

  if (!input.style?.trim()) {
    missing.push("style guide");
  }

  return missing;
}

function inferBudgetPriority(beat: string, sceneNumber: number): BudgetPriority {
  if (/\b(hero|climax|reveal|final|highlight)\b/i.test(beat) || sceneNumber % 7 === 0) {
    return "quality-first";
  }

  if (/\b(draft|test|placeholder|rough)\b/i.test(beat)) {
    return "lowest-cost";
  }

  return "balanced";
}

function inferEmotion(beat: string): SceneEmotion {
  if (/\b(chase|danger|urgent|alarm|escape)\b/i.test(beat)) {
    return "urgent";
  }

  if (/\b(fear|threat|conflict|storm|tense)\b/i.test(beat)) {
    return "tense";
  }

  if (/\b(memory|loss|alone|quiet|soft)\b/i.test(beat)) {
    return "quiet";
  }

  if (/\b(dream|strange|impossible|surreal)\b/i.test(beat)) {
    return "surreal";
  }

  if (/\b(sad|melancholy|farewell)\b/i.test(beat)) {
    return "melancholic";
  }

  return "neutral";
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}
