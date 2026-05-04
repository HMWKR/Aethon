import type {
  AiControlMode,
  AiControlPreferences,
  AiSuggestion,
  AiTaskId,
  SuggestionDecision
} from "./ai-control";

export function resolveTaskMode(
  preferences: AiControlPreferences,
  taskId: AiTaskId
): AiControlMode {
  if (preferences.globalMode === "off") {
    return "off";
  }

  return preferences.taskModes[taskId] ?? preferences.globalMode;
}

export function updateTaskMode(
  preferences: AiControlPreferences,
  taskId: AiTaskId,
  mode: AiControlMode
): AiControlPreferences {
  return {
    ...preferences,
    taskModes: {
      ...preferences.taskModes,
      [taskId]: mode
    }
  };
}

export function updateGlobalMode(
  preferences: AiControlPreferences,
  mode: AiControlMode
): AiControlPreferences {
  return {
    ...preferences,
    globalMode: mode
  };
}

export function decideSuggestion(
  suggestions: AiSuggestion[],
  suggestionId: string,
  decision: Exclude<SuggestionDecision, "pending">,
  decisionReason?: string
): AiSuggestion[] {
  return suggestions.map((suggestion) =>
    suggestion.id === suggestionId
      ? {
          ...suggestion,
          decision,
          decisionReason
        }
      : suggestion
  );
}
