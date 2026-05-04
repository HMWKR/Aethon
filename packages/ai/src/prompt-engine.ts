export const PROMPT_ELEMENT_KEYS = [
  "intent",
  "characters",
  "background",
  "style",
  "continuity",
  "camera",
  "mood"
] as const;

export type PromptElementKey = (typeof PROMPT_ELEMENT_KEYS)[number];

export type PromptIssueSeverity = "warning" | "blocking";

export interface PromptElements {
  intent: string;
  characters: string;
  background: string;
  style: string;
  continuity: string;
  camera: string;
  mood: string;
}

export interface ScenePromptInput {
  intent: string;
  characters: string[];
  background: string;
  style: string;
  continuity: string[];
  camera: string;
  mood: string;
  durationSeconds: number;
  shotType: string;
}

export interface PromptPair {
  imagePrompt: string;
  videoPrompt: string;
  elements: PromptElements;
  checklist: Record<PromptElementKey, boolean>;
}

export interface PromptLintIssue {
  id: string;
  severity: PromptIssueSeverity;
  message: string;
}

export function composePromptPair(input: ScenePromptInput): PromptPair {
  const elements: PromptElements = {
    intent: clean(input.intent, "clear scene intent"),
    characters: cleanList(input.characters, "declared cast"),
    background: clean(input.background, "declared location"),
    style: clean(input.style, "project visual style"),
    continuity: cleanList(input.continuity, "project continuity locks"),
    camera: clean(input.camera, "intentional camera language"),
    mood: clean(input.mood, "neutral emotional tone")
  };

  const imagePrompt = [
    `Intent: ${elements.intent}`,
    `Characters: ${elements.characters}`,
    `Background: ${elements.background}`,
    `Style: ${elements.style}`,
    `Continuity: ${elements.continuity}`,
    `Camera: ${elements.camera}`,
    `Mood: ${elements.mood}`,
    `Still frame: compose a production storyboard keyframe with readable action and no text overlays.`
  ].join("\n");

  const videoPrompt = [
    `Motion: ${motionDirective(input.shotType, elements.intent)}`,
    `Camera: ${elements.camera}`,
    `Duration: ${formatDuration(input.durationSeconds)}`,
    `Continuity: preserve ${elements.continuity}`,
    `Mood: ${elements.mood}`,
    `Action: ${elements.intent}`,
    `Output: natural motion, stable identity, clean temporal consistency.`
  ].join("\n");

  return {
    imagePrompt,
    videoPrompt,
    elements,
    checklist: getPromptChecklist(elements)
  };
}

export function getPromptChecklist(
  elements: PromptElements
): Record<PromptElementKey, boolean> {
  return Object.fromEntries(
    PROMPT_ELEMENT_KEYS.map((key) => [key, elements[key].trim().length > 0])
  ) as Record<PromptElementKey, boolean>;
}

export function lintPromptPair(pair: PromptPair): PromptLintIssue[] {
  const issues: PromptLintIssue[] = [];
  const checklist = getPromptChecklist(pair.elements);

  for (const key of PROMPT_ELEMENT_KEYS) {
    if (!checklist[key]) {
      issues.push({
        id: `prompt-${key}-missing`,
        severity: "blocking",
        message: `${key} is required for an AETHON prompt pair.`
      });
    }
  }

  if (!hasMotionLanguage(pair.videoPrompt)) {
    issues.push({
      id: "video-motion-missing",
      severity: "blocking",
      message: "Video prompts must describe motion, not only appearance."
    });
  }

  if (!/duration:\s*\d+(\.\d+)?s/i.test(pair.videoPrompt)) {
    issues.push({
      id: "video-duration-missing",
      severity: "warning",
      message: "Video prompts should carry an explicit duration."
    });
  }

  if (pair.imagePrompt.length < 120) {
    issues.push({
      id: "image-prompt-thin",
      severity: "warning",
      message: "Image prompts should be rich enough for storyboard review."
    });
  }

  return issues;
}

function clean(value: string, fallback: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized.length > 0 ? normalized : fallback;
}

function cleanList(values: string[], fallback: string): string {
  const normalized = values
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized.join("; ") : fallback;
}

function formatDuration(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(1, value) : 4;

  return `${Math.round(safeValue * 10) / 10}s`;
}

function hasMotionLanguage(value: string): boolean {
  return /\b(motion|move|camera|tracking|pan|tilt|dolly|push|pull|handheld|static|action)\b/i.test(
    value
  );
}

function motionDirective(shotType: string, intent: string): string {
  if (shotType === "action") {
    return `controlled forward movement that follows the action beat: ${intent}`;
  }

  if (shotType === "reaction") {
    return `subtle facial and body reaction with minimal camera drift: ${intent}`;
  }

  if (shotType === "transition") {
    return `smooth transition movement that bridges into the next scene: ${intent}`;
  }

  return `deliberate camera movement that reveals the scene beat: ${intent}`;
}
