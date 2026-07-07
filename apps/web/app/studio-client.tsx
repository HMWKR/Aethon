"use client";

import { useEffect, useMemo, useReducer, useRef, useState, type ChangeEvent } from "react";
import { requestSceneAdvice, type SceneAdviceResult } from "./actions/ai-adviser";
import {
  AI_CONTROL_MODES,
  AI_TASK_DEFAULTS,
  TimelineEditError,
  countRightsIssues,
  decideSuggestion,
  evaluateExportReadiness,
  evaluateSuggestionGate,
  findProviderCapabilityByModel,
  formatTimecode,
  formatUsd,
  getClipAtPlayhead,
  getClipsForTrack,
  getRecommendedOption,
  getTimelineVisibleRange,
  getValidationStatus,
  getTimelineDurationSeconds,
  applyTimelineEdit,
  moveClipToTime,
  redoTimelineEdit,
  resolveTaskMode,
  rippleDeleteClip,
  rippleTrimClipEnd,
  rippleTrimClipStart,
  rollEditBoundary,
  setTimelineScroll,
  setTimelineZoom,
  summarizeExportManifestEvidence,
  snapClipStartToPreviousBoundary,
  slipClipInPoint,
  splitClipAtTime,
  sumRecommendedCost,
  trimClipEnd,
  trimClipStart,
  undoTimelineEdit,
  updateGlobalMode,
  updateTaskMode,
  type AiControlMode,
  type AiControlPreferences,
  type AiSuggestion,
  type AiTaskId,
  type ClipSourceType,
  type EditClip,
  type EditingWorkspace,
  type EditToolId,
  type ExportManifest,
  type ExportReadiness,
  type ProviderCapability,
  type SceneSpec,
  type SceneDecision,
  type SourceMediaMetadata,
  type SuggestionDecision,
  type TimelineEditOperation,
  type ValidationReport
} from "@aethon/core";

interface StudioClientProps {
  initialPreferences: AiControlPreferences;
  initialExportManifest: ExportManifest;
  initialMediaSources: SourceMediaMetadata[];
  initialScenes: SceneDecision[];
  initialSceneSpecs: SceneSpec[];
  initialSuggestions: AiSuggestion[];
  initialValidationReports: ValidationReport[];
  initialWorkspace: EditingWorkspace;
}

interface StudioState {
  preferences: AiControlPreferences;
  exportManifest: ExportManifest;
  mediaSources: SourceMediaMetadata[];
  scenes: SceneDecision[];
  sceneSpecs: SceneSpec[];
  suggestions: AiSuggestion[];
  validationReports: ValidationReport[];
  workspace: EditingWorkspace;
  timelinePast: EditingWorkspace[];
  timelineFuture: EditingWorkspace[];
  selectedSceneId: string;
  selectedClipId: string;
  selectedMediaSourceId: string;
  mediaSearchQuery: string;
  mediaTagFilter: string;
  inspectorTab: "ai" | "clip" | "export";
}

type StudioAction =
  | { type: "select-scene"; sceneId: string }
  | { type: "select-clip"; clip: EditClip }
  | { type: "select-media-source"; sourceId: string }
  | { type: "set-media-search-query"; query: string }
  | { type: "set-media-tag-filter"; tag: string }
  | { type: "restore-imported-media-sources"; sources: SourceMediaMetadata[] }
  | { type: "import-media-sources"; sources: SourceMediaMetadata[] }
  | { type: "set-tool"; tool: EditToolId }
  | { type: "split-selected-clip" }
  | { type: "ripple-delete-selected-clip" }
  | { type: "trim-selected-clip-start" }
  | { type: "trim-selected-clip-end" }
  | { type: "move-selected-clip"; direction: "backward" | "forward" }
  | { type: "move-clip-to-time"; clipId: string; startSeconds: number }
  | { type: "snap-selected-clip" }
  | { type: "roll-selected-boundary-forward" }
  | { type: "roll-clip-start-boundary-to-time"; clipId: string; boundarySeconds: number }
  | { type: "ripple-trim-clip-end-to-time"; clipId: string; endSeconds: number }
  | { type: "ripple-trim-clip-start-to-time"; clipId: string; startSeconds: number }
  | { type: "slip-selected-clip-forward" }
  | { type: "trim-clip-start-to-time"; clipId: string; startSeconds: number }
  | { type: "trim-clip-end-to-time"; clipId: string; endSeconds: number }
  | { type: "restore-timeline-viewport"; scrollSeconds: number; zoom: number }
  | { type: "scroll-timeline"; direction: "left" | "right" }
  | { type: "set-timeline-scroll"; scrollSeconds: number }
  | { type: "zoom-timeline"; direction: "in" | "out" }
  | { type: "undo-timeline-edit" }
  | { type: "redo-timeline-edit" }
  | { type: "set-inspector-tab"; tab: StudioState["inspectorTab"] }
  | { type: "set-global-mode"; mode: AiControlMode }
  | { type: "set-task-mode"; taskId: AiTaskId; mode: AiControlMode }
  | {
      type: "decide-suggestion";
      suggestionId: string;
      decision: Exclude<SuggestionDecision, "pending">;
      decisionReason: string;
    };

const TOOL_LABELS: Record<EditToolId, string> = {
  select: "V",
  trim: "T",
  blade: "B",
  slip: "S",
  hand: "H",
  text: "TXT",
  pin: "PIN"
};

const TIMELINE_MOVE_STEP_SECONDS = 1;
const TIMELINE_TRIM_STEP_SECONDS = 0.5;
const TIMELINE_MIN_TRIMMABLE_DURATION_SECONDS = TIMELINE_TRIM_STEP_SECONDS + 0.1;
const TIMELINE_ROLL_STEP_SECONDS = 0.5;
const TIMELINE_SLIP_STEP_SECONDS = 0.5;
const TIMELINE_ZOOM_STEP = 0.25;
const TIMELINE_SCROLL_PAGE_RATIO = 0.25;
const TIMELINE_GESTURE_SECONDS_STEP = 0.1;
const TIMELINE_VIEWPORT_STORAGE_KEY = "aethon.timelineViewport.v1";
const IMPORTED_MEDIA_STORAGE_KEY = "aethon.importedMediaSources.v1";
const IMPORTED_MEDIA_ID_PREFIX = "imported-";
const ASSET_TILE_TONES = ["blue", "green", "violet", "yellow"] as const;
const CLIP_SOURCE_TYPES = [
  "generated-video",
  "generated-image",
  "uploaded-video",
  "uploaded-image",
  "uploaded-audio",
  "text",
  "adjustment"
] as const satisfies readonly ClipSourceType[];

type ImportedMediaSourceType = Extract<
  ClipSourceType,
  "uploaded-video" | "uploaded-audio" | "uploaded-image"
>;

const IMPORTED_MEDIA_DEFAULT_DURATION_SECONDS: Record<ImportedMediaSourceType, number> = {
  "uploaded-video": 8,
  "uploaded-audio": 6,
  "uploaded-image": 4
};

type AssetTileTone = (typeof ASSET_TILE_TONES)[number];

type TimelineGestureMode =
  | "move"
  | "trim-start"
  | "trim-end"
  | "roll-start"
  | "ripple-start"
  | "ripple-end";

interface TimelineGestureState {
  clipId: string;
  initialDurationSeconds: number;
  initialStartSeconds: number;
  laneWidthPx: number;
  mode: TimelineGestureMode;
  pointerId: number;
  startClientX: number;
  visibleDurationSeconds: number;
}

interface TimelineViewportSnapshot {
  scrollSeconds: number;
  zoom: number;
}

function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case "select-scene": {
      const sceneClip = state.workspace.clips.find((clip) => clip.sceneId === action.sceneId);

      return {
        ...state,
        selectedSceneId: action.sceneId,
        selectedClipId: sceneClip?.id ?? state.selectedClipId,
        selectedMediaSourceId: sceneClip?.sourceAssetId ?? state.selectedMediaSourceId,
        workspace: sceneClip
          ? {
              ...state.workspace,
              playheadSeconds: sceneClip.startSeconds
            }
          : state.workspace
      };
    }
    case "select-clip":
      return {
        ...state,
        selectedClipId: action.clip.id,
        selectedSceneId: action.clip.sceneId ?? state.selectedSceneId,
        selectedMediaSourceId: action.clip.sourceAssetId ?? state.selectedMediaSourceId,
        inspectorTab: "clip",
        workspace: {
          ...state.workspace,
          playheadSeconds: action.clip.startSeconds
        }
      };
    case "select-media-source":
      return {
        ...state,
        selectedMediaSourceId: action.sourceId
      };
    case "set-media-search-query":
      return {
        ...state,
        mediaSearchQuery: action.query
      };
    case "set-media-tag-filter":
      return {
        ...state,
        mediaTagFilter: action.tag
      };
    case "restore-imported-media-sources":
      if (action.sources.length === 0) {
        return state;
      }

      return {
        ...state,
        mediaSources: mergeMediaSources(state.mediaSources, action.sources)
      };
    case "import-media-sources": {
      if (action.sources.length === 0) {
        return state;
      }

      return {
        ...state,
        mediaSources: mergeMediaSources(state.mediaSources, action.sources),
        selectedMediaSourceId: action.sources[0]?.id ?? state.selectedMediaSourceId
      };
    }
    case "set-tool":
      return {
        ...state,
        workspace: {
          ...state.workspace,
          activeTool: action.tool
        }
      };
    case "split-selected-clip": {
      const selectedClip = getSelectedClip(state);

      if (!selectedClip || selectedClip.durationSeconds <= 0.1) {
        return state;
      }

      const splitSeconds = selectedClip.startSeconds + selectedClip.durationSeconds / 2;

      return applyWorkspaceEdit(state, (workspace) =>
        splitClipAtTime(workspace, selectedClip.id, splitSeconds)
      );
    }
    case "ripple-delete-selected-clip": {
      if (!getSelectedClip(state)) {
        return state;
      }

      return applyWorkspaceEdit(state, (workspace) =>
        rippleDeleteClip(workspace, state.selectedClipId)
      );
    }
    case "trim-selected-clip-start": {
      const selectedClip = getSelectedClip(state);

      if (!selectedClip || selectedClip.durationSeconds <= TIMELINE_MIN_TRIMMABLE_DURATION_SECONDS) {
        return state;
      }

      return applyWorkspaceEdit(state, (workspace) =>
        trimClipStart(
          workspace,
          selectedClip.id,
          selectedClip.startSeconds + TIMELINE_TRIM_STEP_SECONDS
        )
      );
    }
    case "trim-selected-clip-end": {
      const selectedClip = getSelectedClip(state);

      if (!selectedClip || selectedClip.durationSeconds <= TIMELINE_MIN_TRIMMABLE_DURATION_SECONDS) {
        return state;
      }

      return applyWorkspaceEdit(state, (workspace) =>
        trimClipEnd(
          workspace,
          selectedClip.id,
          selectedClip.startSeconds + selectedClip.durationSeconds - TIMELINE_TRIM_STEP_SECONDS
        )
      );
    }
    case "move-selected-clip": {
      const selectedClip = getSelectedClip(state);

      if (!selectedClip) {
        return state;
      }

      const directionMultiplier = action.direction === "forward" ? 1 : -1;

      return applyWorkspaceEdit(state, (workspace) =>
        moveClipToTime(
          workspace,
          selectedClip.id,
          selectedClip.startSeconds + directionMultiplier * TIMELINE_MOVE_STEP_SECONDS
        )
      );
    }
    case "move-clip-to-time": {
      const clip = state.workspace.clips.find((candidate) => candidate.id === action.clipId);

      if (!clip) {
        return state;
      }

      return applyWorkspaceEdit(selectClipInState(state, clip), (workspace) =>
        moveClipToTime(workspace, action.clipId, action.startSeconds, { snap: { enabled: false } })
      );
    }
    case "snap-selected-clip": {
      if (!getSelectedClip(state)) {
        return state;
      }

      return applyWorkspaceEdit(state, (workspace) =>
        snapClipStartToPreviousBoundary(workspace, state.selectedClipId)
      );
    }
    case "roll-selected-boundary-forward": {
      const selectedClip = getSelectedClip(state);

      if (!selectedClip) {
        return state;
      }

      const previousClip = getPreviousClipOnSameTrack(state.workspace, selectedClip);

      if (!previousClip) {
        return state;
      }

      return applyWorkspaceEdit(state, (workspace) =>
        rollEditBoundary(
          workspace,
          previousClip.id,
          selectedClip.id,
          selectedClip.startSeconds + TIMELINE_ROLL_STEP_SECONDS
        )
      );
    }
    case "roll-clip-start-boundary-to-time": {
      const rightClip = state.workspace.clips.find((candidate) => candidate.id === action.clipId);

      if (!rightClip) {
        return state;
      }

      const leftClip = getPreviousClipOnSameTrack(state.workspace, rightClip);

      if (!leftClip) {
        return state;
      }

      return applyWorkspaceEdit(selectClipInState(state, rightClip), (workspace) =>
        rollEditBoundary(workspace, leftClip.id, rightClip.id, action.boundarySeconds, {
          snap: { enabled: false }
        })
      );
    }
    case "ripple-trim-clip-end-to-time": {
      const clip = state.workspace.clips.find((candidate) => candidate.id === action.clipId);

      if (!clip || clip.durationSeconds <= TIMELINE_MIN_TRIMMABLE_DURATION_SECONDS) {
        return state;
      }

      return applyWorkspaceEdit(selectClipInState(state, clip), (workspace) =>
        rippleTrimClipEnd(workspace, action.clipId, action.endSeconds, {
          snap: { enabled: false }
        })
      );
    }
    case "ripple-trim-clip-start-to-time": {
      const clip = state.workspace.clips.find((candidate) => candidate.id === action.clipId);

      if (!clip || clip.durationSeconds <= TIMELINE_MIN_TRIMMABLE_DURATION_SECONDS) {
        return state;
      }

      return applyWorkspaceEdit(selectClipInState(state, clip), (workspace) =>
        rippleTrimClipStart(workspace, action.clipId, action.startSeconds, {
          snap: { enabled: false }
        })
      );
    }
    case "slip-selected-clip-forward": {
      if (!getSelectedClip(state)) {
        return state;
      }

      return applyWorkspaceEdit(state, (workspace) =>
        slipClipInPoint(workspace, state.selectedClipId, TIMELINE_SLIP_STEP_SECONDS)
      );
    }
    case "trim-clip-start-to-time": {
      const clip = state.workspace.clips.find((candidate) => candidate.id === action.clipId);

      if (!clip || clip.durationSeconds <= TIMELINE_MIN_TRIMMABLE_DURATION_SECONDS) {
        return state;
      }

      return applyWorkspaceEdit(selectClipInState(state, clip), (workspace) =>
        trimClipStart(workspace, action.clipId, action.startSeconds, { snap: { enabled: false } })
      );
    }
    case "trim-clip-end-to-time": {
      const clip = state.workspace.clips.find((candidate) => candidate.id === action.clipId);

      if (!clip || clip.durationSeconds <= TIMELINE_MIN_TRIMMABLE_DURATION_SECONDS) {
        return state;
      }

      return applyWorkspaceEdit(selectClipInState(state, clip), (workspace) =>
        trimClipEnd(workspace, action.clipId, action.endSeconds, { snap: { enabled: false } })
      );
    }
    case "restore-timeline-viewport": {
      const zoomedWorkspace = setTimelineZoom(state.workspace, action.zoom);

      return {
        ...state,
        workspace: setTimelineScroll(zoomedWorkspace, action.scrollSeconds)
      };
    }
    case "scroll-timeline": {
      const visibleRange = getTimelineVisibleRange(state.workspace);
      const scrollDelta =
        visibleRange.durationSeconds * TIMELINE_SCROLL_PAGE_RATIO *
        (action.direction === "right" ? 1 : -1);

      return {
        ...state,
        workspace: setTimelineScroll(
          state.workspace,
          state.workspace.scrollSeconds + scrollDelta
        )
      };
    }
    case "set-timeline-scroll":
      return {
        ...state,
        workspace: setTimelineScroll(state.workspace, action.scrollSeconds)
      };
    case "zoom-timeline": {
      const zoomDelta = action.direction === "in" ? TIMELINE_ZOOM_STEP : -TIMELINE_ZOOM_STEP;

      return {
        ...state,
        workspace: setTimelineZoom(state.workspace, state.workspace.zoom + zoomDelta)
      };
    }
    case "undo-timeline-edit": {
      const history = undoTimelineEdit({
        past: state.timelinePast,
        present: state.workspace,
        future: state.timelineFuture
      });

      return syncSelectionAfterTimelineEdit(state, history.present, history.past, history.future);
    }
    case "redo-timeline-edit": {
      const history = redoTimelineEdit({
        past: state.timelinePast,
        present: state.workspace,
        future: state.timelineFuture
      });

      return syncSelectionAfterTimelineEdit(state, history.present, history.past, history.future);
    }
    case "set-inspector-tab":
      return {
        ...state,
        inspectorTab: action.tab
      };
    case "set-global-mode":
      return {
        ...state,
        preferences: updateGlobalMode(state.preferences, action.mode)
      };
    case "set-task-mode":
      return {
        ...state,
        preferences: updateTaskMode(state.preferences, action.taskId, action.mode)
      };
    case "decide-suggestion":
      return {
        ...state,
        suggestions: decideSuggestion(
          state.suggestions,
          action.suggestionId,
          action.decision,
          action.decisionReason
        ),
        scenes: state.scenes.map((scene) =>
          scene.id === state.selectedSceneId && action.decision === "accepted"
            ? { ...scene, status: "approved" }
            : scene
        )
      };
    default:
      return state;
  }
}

function getSelectedClip(state: StudioState): EditClip | undefined {
  return state.workspace.clips.find((clip) => clip.id === state.selectedClipId);
}

function selectClipInState(state: StudioState, clip: EditClip): StudioState {
  return {
    ...state,
    selectedClipId: clip.id,
    selectedSceneId: clip.sceneId ?? state.selectedSceneId,
    inspectorTab: "clip",
    workspace: {
      ...state.workspace,
      playheadSeconds: clip.startSeconds
    }
  };
}

function roundTimelineGestureSeconds(seconds: number): number {
  return Math.round(seconds / TIMELINE_GESTURE_SECONDS_STEP) * TIMELINE_GESTURE_SECONDS_STEP;
}

function readPersistedTimelineViewport(): TimelineViewportSnapshot | undefined {
  try {
    const rawSnapshot = window.localStorage.getItem(TIMELINE_VIEWPORT_STORAGE_KEY);

    if (!rawSnapshot) {
      return undefined;
    }

    const parsed = JSON.parse(rawSnapshot) as Partial<TimelineViewportSnapshot>;

    if (
      typeof parsed.zoom !== "number" ||
      !Number.isFinite(parsed.zoom) ||
      typeof parsed.scrollSeconds !== "number" ||
      !Number.isFinite(parsed.scrollSeconds)
    ) {
      return undefined;
    }

    return {
      scrollSeconds: parsed.scrollSeconds,
      zoom: parsed.zoom
    };
  } catch {
    return undefined;
  }
}

function getPreviousClipOnSameTrack(
  workspace: EditingWorkspace,
  clip: EditClip
): EditClip | undefined {
  return getClipsForTrack(workspace, clip.trackId)
    .filter((candidate) => candidate.startSeconds < clip.startSeconds)
    .at(-1);
}

function applyWorkspaceEdit(state: StudioState, operation: TimelineEditOperation): StudioState {
  try {
    const history = applyTimelineEdit(
      {
        past: state.timelinePast,
        present: state.workspace,
        future: state.timelineFuture
      },
      operation
    );

    return syncSelectionAfterTimelineEdit(state, history.present, history.past, history.future);
  } catch (error) {
    if (error instanceof TimelineEditError) {
      return state;
    }

    throw error;
  }
}

function syncSelectionAfterTimelineEdit(
  state: StudioState,
  workspace: EditingWorkspace,
  timelinePast: EditingWorkspace[],
  timelineFuture: EditingWorkspace[]
): StudioState {
  const selectedClip =
    workspace.clips.find((clip) => clip.id === state.selectedClipId) ??
    getClipAtPlayhead(workspace) ??
    workspace.clips[0];

  return {
    ...state,
    workspace,
    timelinePast,
    timelineFuture,
    selectedClipId: selectedClip?.id ?? "",
    selectedMediaSourceId: selectedClip?.sourceAssetId ?? state.selectedMediaSourceId,
    selectedSceneId: selectedClip?.sceneId ?? state.selectedSceneId,
    inspectorTab: "clip"
  };
}

export function StudioClient({
  initialPreferences,
  initialExportManifest,
  initialMediaSources,
  initialScenes,
  initialSceneSpecs,
  initialSuggestions,
  initialValidationReports,
  initialWorkspace
}: StudioClientProps) {
  const timelineGestureRef = useRef<TimelineGestureState | null>(null);
  const timelineViewportPersistenceReadyRef = useRef(false);
  const mediaImportPersistenceReadyRef = useRef(false);
  const initialSelectedClip = initialWorkspace.clips[3] ?? initialWorkspace.clips[0];
  const [state, dispatch] = useReducer(studioReducer, {
    preferences: initialPreferences,
    exportManifest: initialExportManifest,
    mediaSources: initialMediaSources,
    scenes: initialScenes,
    sceneSpecs: initialSceneSpecs,
    suggestions: initialSuggestions,
    validationReports: initialValidationReports,
    workspace: initialWorkspace,
    timelinePast: [],
    timelineFuture: [],
    selectedSceneId: initialScenes[1]?.id ?? initialScenes[0]?.id ?? "",
    selectedClipId: initialSelectedClip?.id ?? "",
    selectedMediaSourceId:
      initialSelectedClip?.sourceAssetId ?? initialMediaSources[0]?.id ?? "",
    mediaSearchQuery: "",
    mediaTagFilter: "",
    inspectorTab: "ai"
  });

  const timelineDuration = getTimelineDurationSeconds(state.workspace);
  const timelineVisibleRange = getTimelineVisibleRange(state.workspace, timelineDuration);
  const timelineVisibleDuration = Math.max(timelineVisibleRange.durationSeconds, 1);
  const timelineScrollbarMax = Number(timelineVisibleRange.maxScrollSeconds.toFixed(2));
  const timelineWindowLeftPercent =
    timelineDuration > 0
      ? (timelineVisibleRange.startSeconds / timelineDuration) * 100
      : 0;
  const timelineWindowWidthPercent =
    timelineDuration > 0
      ? (timelineVisibleRange.durationSeconds / timelineDuration) * 100
      : 100;
  const selectedClip = useMemo(
    () =>
      state.workspace.clips.find((clip) => clip.id === state.selectedClipId) ??
      state.workspace.clips[0],
    [state.selectedClipId, state.workspace.clips]
  );
  const selectedMediaSource = useMemo(
    () =>
      selectedClip?.sourceAssetId
        ? state.mediaSources.find((source) => source.id === selectedClip.sourceAssetId)
        : undefined,
    [selectedClip?.sourceAssetId, state.mediaSources]
  );
  const selectedProjectMediaSource = useMemo(
    () =>
      state.mediaSources.find((source) => source.id === state.selectedMediaSourceId) ??
      selectedMediaSource,
    [selectedMediaSource, state.mediaSources, state.selectedMediaSourceId]
  );
  const browserLocalImportCount = useMemo(
    () => state.mediaSources.filter(isImportedMediaSource).length,
    [state.mediaSources]
  );
  const mediaTagOptions = useMemo(() => getMediaTagOptions(state.mediaSources), [state.mediaSources]);
  const visibleMediaSources = useMemo(
    () => filterMediaSources(state.mediaSources, state.mediaSearchQuery, state.mediaTagFilter),
    [state.mediaSearchQuery, state.mediaSources, state.mediaTagFilter]
  );
  const activePlayheadClip = getClipAtPlayhead(state.workspace);
  const selectedScene = useMemo(
    () =>
      state.scenes.find((scene) => scene.id === state.selectedSceneId) ?? state.scenes[0],
    [state.scenes, state.selectedSceneId]
  );
  const selectedSceneSpec = useMemo(
    () =>
      state.sceneSpecs.find((spec) => spec.sceneId === selectedScene?.id) ??
      state.sceneSpecs[0],
    [selectedScene?.id, state.sceneSpecs]
  );
  const selectedCapability = selectedSceneSpec
    ? findProviderCapabilityByModel(selectedSceneSpec.videoModel)
    : undefined;
  const selectedValidationReports = useMemo(
    () =>
      state.validationReports.filter((report) => report.sceneId === selectedScene?.id),
    [selectedScene?.id, state.validationReports]
  );
  const selectedSuggestion = useMemo(
    () =>
      state.suggestions.find(
        (suggestion) =>
          suggestion.sceneId === selectedScene?.id && suggestion.decision === "pending"
      ),
    [selectedScene?.id, state.suggestions]
  );
  const gate = selectedSuggestion
    ? evaluateSuggestionGate(selectedSuggestion, state.preferences)
    : undefined;
  const pendingCount = state.suggestions.filter(
    (suggestion) => suggestion.decision === "pending"
  ).length;
  const acceptedCount = state.suggestions.filter(
    (suggestion) => suggestion.decision === "accepted"
  ).length;
  const requiredValidationSceneIds = useMemo(
    () =>
      Array.from(
        new Set(
          state.workspace.clips
            .filter((clip) => clip.sourceType === "generated-video" && clip.sceneId)
            .map((clip) => clip.sceneId!)
        )
      ),
    [state.workspace.clips]
  );
  const exportReadiness = evaluateExportReadiness({
    manifest: state.exportManifest,
    pendingSuggestionCount: pendingCount,
    requiredValidationSceneIds,
    reports: state.validationReports
  });
  const getTimelineViewportPercent = (seconds: number) =>
    ((seconds - timelineVisibleRange.startSeconds) / timelineVisibleDuration) * 100;

  function beginTimelineGesture(
    event: React.PointerEvent<HTMLElement>,
    clip: EditClip,
    mode: TimelineGestureMode
  ): void {
    if (event.button !== 0) {
      return;
    }

    const lane = event.currentTarget.closest(".clip-lane-inner");
    const laneBox = lane?.getBoundingClientRect();

    if (!laneBox || laneBox.width <= 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    timelineGestureRef.current = {
      clipId: clip.id,
      initialDurationSeconds: clip.durationSeconds,
      initialStartSeconds: clip.startSeconds,
      laneWidthPx: laneBox.width,
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      visibleDurationSeconds: timelineVisibleRange.durationSeconds
    };
    dispatch({ type: "select-clip", clip });
  }

  function updateTimelineGesture(event: React.PointerEvent<HTMLElement>): void {
    const gesture = timelineGestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    const deltaSeconds = roundTimelineGestureSeconds(
      ((event.clientX - gesture.startClientX) / gesture.laneWidthPx) *
        gesture.visibleDurationSeconds
    );

    if (Math.abs(deltaSeconds) < TIMELINE_GESTURE_SECONDS_STEP) {
      return;
    }

    event.preventDefault();

    if (gesture.mode === "move") {
      dispatch({
        type: "move-clip-to-time",
        clipId: gesture.clipId,
        startSeconds: Math.max(0, gesture.initialStartSeconds + deltaSeconds)
      });
      return;
    }

    if (gesture.mode === "trim-start") {
      dispatch({
        type: "trim-clip-start-to-time",
        clipId: gesture.clipId,
        startSeconds: gesture.initialStartSeconds + deltaSeconds
      });
      return;
    }

    if (gesture.mode === "roll-start") {
      dispatch({
        type: "roll-clip-start-boundary-to-time",
        clipId: gesture.clipId,
        boundarySeconds: gesture.initialStartSeconds + deltaSeconds
      });
      return;
    }

    if (gesture.mode === "ripple-start") {
      dispatch({
        type: "ripple-trim-clip-start-to-time",
        clipId: gesture.clipId,
        startSeconds: gesture.initialStartSeconds + deltaSeconds
      });
      return;
    }

    if (gesture.mode === "ripple-end") {
      dispatch({
        type: "ripple-trim-clip-end-to-time",
        clipId: gesture.clipId,
        endSeconds: gesture.initialStartSeconds + gesture.initialDurationSeconds + deltaSeconds
      });
      return;
    }

    dispatch({
      type: "trim-clip-end-to-time",
      clipId: gesture.clipId,
      endSeconds: gesture.initialStartSeconds + gesture.initialDurationSeconds + deltaSeconds
    });
  }

  function endTimelineGesture(event: React.PointerEvent<HTMLElement>): void {
    const gesture = timelineGestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    timelineGestureRef.current = null;
  }

  function handleMediaImport(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    dispatch({
      type: "import-media-sources",
      sources: files.map(createImportedMediaSource)
    });
    event.target.value = "";
  }

  useEffect(() => {
    if (!timelineViewportPersistenceReadyRef.current) {
      return;
    }

    window.localStorage.setItem(
      TIMELINE_VIEWPORT_STORAGE_KEY,
      JSON.stringify({
        scrollSeconds: state.workspace.scrollSeconds,
        zoom: state.workspace.zoom
      })
    );
  }, [state.workspace.scrollSeconds, state.workspace.zoom]);

  useEffect(() => {
    const persistedViewport = readPersistedTimelineViewport();

    if (persistedViewport) {
      dispatch({
        type: "restore-timeline-viewport",
        scrollSeconds: persistedViewport.scrollSeconds,
        zoom: persistedViewport.zoom
      });
    }

    timelineViewportPersistenceReadyRef.current = true;
  }, []);

  useEffect(() => {
    const persistedSources = readPersistedImportedMediaSources();

    if (persistedSources.length > 0) {
      dispatch({ type: "restore-imported-media-sources", sources: persistedSources });
    }
  }, []);

  useEffect(() => {
    if (!mediaImportPersistenceReadyRef.current) {
      mediaImportPersistenceReadyRef.current = true;
      return;
    }

    window.localStorage.setItem(
      IMPORTED_MEDIA_STORAGE_KEY,
      JSON.stringify(state.mediaSources.filter(isImportedMediaSource))
    );
  }, [state.mediaSources]);

  useEffect(() => {
    function handleTimelineShortcut(event: KeyboardEvent) {
      if (isEditableShortcutTarget(event.target)) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "ArrowLeft") {
        event.preventDefault();
        dispatch({ type: "move-selected-clip", direction: "backward" });
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "ArrowRight") {
        event.preventDefault();
        dispatch({ type: "move-selected-clip", direction: "forward" });
        return;
      }

      if (event.shiftKey && event.key === "ArrowRight") {
        event.preventDefault();
        dispatch({ type: "roll-selected-boundary-forward" });
        return;
      }

      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        dispatch({ type: "slip-selected-clip-forward" });
        return;
      }

      if (event.key === "[") {
        event.preventDefault();
        dispatch({ type: "trim-selected-clip-start" });
        return;
      }

      if (event.key === "]") {
        event.preventDefault();
        dispatch({ type: "trim-selected-clip-end" });
        return;
      }

      // 단일 키 도구/줌 단축키가 브라우저 표준 단축키(Ctrl/Cmd/Alt 조합)를 하이잭하지 않도록 차단한다.
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (event.key.toLowerCase() === "v") {
        dispatch({ type: "set-tool", tool: "select" });
        return;
      }

      if (event.key.toLowerCase() === "b") {
        dispatch({ type: "set-tool", tool: "blade" });
        return;
      }

      if (event.key.toLowerCase() === "s") {
        dispatch({ type: "set-tool", tool: "slip" });
        return;
      }

      if (event.key.toLowerCase() === "t") {
        dispatch({ type: "set-tool", tool: "trim" });
        return;
      }

      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        dispatch({ type: "zoom-timeline", direction: "in" });
        return;
      }

      if (event.key === "-") {
        event.preventDefault();
        dispatch({ type: "zoom-timeline", direction: "out" });
      }
    }

    window.addEventListener("keydown", handleTimelineShortcut);

    return () => window.removeEventListener("keydown", handleTimelineShortcut);
  }, []);

  return (
    <main className="editor-shell">
      <header className="app-chrome">
        <div className="brand-lockup">
          <span className="app-mark">A</span>
          <div>
            <strong>AETHON Cut Workspace</strong>
            <span>AI Video IDE + professional editor</span>
          </div>
        </div>
        <div className="workspace-tabs" aria-label="Workspace tabs">
          {["Edit", "AI Assist", "Color", "Audio", "Export"].map((tab) => (
            <button
              className={tab === "Edit" ? "active" : ""}
              disabled={tab !== "Edit"}
              key={tab}
              title={tab === "Edit" ? undefined : "준비 중 (미구현)"}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="session-readout">
          <span>{formatTimecode(state.workspace.playheadSeconds)}</span>
          <span>{state.workspace.exportProfile.label}</span>
        </div>
      </header>

      <section className="editor-grid" aria-label="AETHON editing workspace">
        <aside className="project-column" data-testid="project-bin-panel">
          <PanelTitle eyebrow="Project Bin" title="References and media" />
          <div className="bin-tabs">
            <button className="active" type="button">Media</button>
            <button disabled title="준비 중 (미구현)" type="button">Characters</button>
            <button disabled title="준비 중 (미구현)" type="button">Styles</button>
          </div>
          <div className="media-import-strip">
            <label className="media-import-button" htmlFor="media-import-input">
              Import Media
            </label>
            <input
              accept="video/*,audio/*,image/*"
              className="media-import-input"
              data-testid="media-import-input"
              id="media-import-input"
              multiple
              onChange={handleMediaImport}
              type="file"
            />
            <span data-testid="media-import-readout">
              {browserLocalImportCount} browser-local import
              {browserLocalImportCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="media-filter-strip" data-testid="media-filter-strip">
            <input
              aria-label="Search media"
              data-testid="media-search-input"
              onChange={(event) =>
                dispatch({ type: "set-media-search-query", query: event.target.value })
              }
              placeholder="Search media"
              type="search"
              value={state.mediaSearchQuery}
            />
            <select
              aria-label="Filter media tag"
              data-testid="media-tag-filter"
              onChange={(event) =>
                dispatch({ type: "set-media-tag-filter", tag: event.target.value })
              }
              value={state.mediaTagFilter}
            >
              <option value="">All tags</option>
              {mediaTagOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <span data-testid="media-filter-readout">
              {visibleMediaSources.length} of {state.mediaSources.length} sources
            </span>
          </div>
          <div className="asset-grid">
            <AssetTile label="@Mina" meta="Character lock 86" tone="blue" />
            <AssetTile label="@RainAlley" meta="Location lock 91" tone="green" />
            <AssetTile label="@NoirBlue" meta="Look preset" tone="violet" />
            {visibleMediaSources.map((source, index) => (
              <AssetTile
                active={source.id === selectedProjectMediaSource?.id}
                key={source.id}
                label={source.label}
                meta={formatMediaSourceMeta(source)}
                onClick={() => dispatch({ type: "select-media-source", sourceId: source.id })}
                tags={source.tags}
                testId={`media-source-${source.id}`}
                thumbnailLabel={source.thumbnailLabel}
                tone={getAssetTone(index)}
              />
            ))}
            {visibleMediaSources.length === 0 ? (
              <div className="asset-empty" data-testid="media-empty-state">
                No sources match this filter.
              </div>
            ) : null}
          </div>
          <div className="ide-panel">
            <PanelTitle eyebrow="IDE Context" title="Scene memory" />
            <ContextRow label="World bible" value="Rain noir / narrow alley" />
            <ContextRow label="Continuity" value="Character, palette, hand pose" />
            <ContextRow label="Decision rule" value="AI suggests. Editor decides." />
          </div>
        </aside>

        <section className="monitor-stack" data-testid="monitor-stack">
          <div className="monitor-grid">
            <Monitor
              label="Source Monitor"
              testId="source-monitor"
              title={selectedProjectMediaSource?.label ?? selectedClip?.label ?? "No clip selected"}
              meta={
                selectedProjectMediaSource
                  ? `${selectedProjectMediaSource.sourceType} / ${formatTimecode(
                      selectedProjectMediaSource.durationSeconds
                    )}`
                  : `${selectedClip?.sourceType ?? "offline"} / ${
                      selectedClip?.status ?? "offline"
                    }`
              }
            >
              <div className="source-frame">
                <div className="keyframe-card start">
                  <span>START</span>
                  <strong>pose A</strong>
                </div>
                <div className="keyframe-card end">
                  <span>END</span>
                  <strong>pose B</strong>
                </div>
                <div className="source-media-readout" data-testid="source-monitor-media-readout">
                  <span>Selected source</span>
                  <strong>{selectedProjectMediaSource?.sourceType ?? "offline"}</strong>
                  <small data-testid="source-monitor-source-duration">
                    {selectedProjectMediaSource
                      ? `${formatTimecode(selectedProjectMediaSource.durationSeconds)} / ${
                          selectedProjectMediaSource.metadataSource
                        }`
                      : "No source metadata"}
                  </small>
                </div>
                <div className="monitor-command-row">
                  <button
                    data-testid="source-monitor-slip-button"
                    disabled={!selectedClip}
                    onClick={() => dispatch({ type: "slip-selected-clip-forward" })}
                    type="button"
                  >
                    Source Slip +0.5s
                  </button>
                </div>
              </div>
            </Monitor>
            <Monitor
              label="Program Monitor"
              testId="program-monitor"
              title={selectedScene?.title ?? "Program"}
              meta={`Playhead ${formatTimecode(state.workspace.playheadSeconds)}`}
            >
              <div className="program-frame">
                <div className="frame-safe-area" />
                <span aria-hidden="true" className="revision-pin">hand</span>
                <span aria-hidden="true" className="revision-pin secondary">face</span>
                <div className="program-caption">
                  <strong>{activePlayheadClip?.label ?? "No active clip"}</strong>
                  <span>{selectedScene?.modelRecommendation.primary ?? "Manual"}</span>
                </div>
                <div className="monitor-command-row program">
                  <button
                    data-testid="program-monitor-roll-button"
                    disabled={!selectedClip}
                    onClick={() => dispatch({ type: "roll-selected-boundary-forward" })}
                    type="button"
                  >
                    Program Roll +0.5s
                  </button>
                </div>
              </div>
            </Monitor>
          </div>
          <div className="transport-bar">
            <button disabled title="준비 중 (미구현)" type="button">Step Back</button>
            <button className="primary" disabled title="준비 중 (미구현)" type="button">Play</button>
            <button disabled title="준비 중 (미구현)" type="button">Step Forward</button>
            <span>{formatTimecode(timelineDuration)}</span>
            <div className="meter">
              <span style={{ width: "68%" }} />
            </div>
          </div>
        </section>

        <aside className="inspector-column" data-testid="inspector-panel">
          <div aria-label="Inspector tabs" className="inspector-tabs" data-testid="inspector-tabs">
            {(["ai", "clip", "export"] as const).map((tab) => (
              <button
                aria-pressed={state.inspectorTab === tab}
                className={state.inspectorTab === tab ? "active" : ""}
                data-testid={`inspector-tab-${tab}`}
                key={tab}
                onClick={() => dispatch({ type: "set-inspector-tab", tab })}
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>
          {state.inspectorTab === "ai" ? (
            <AiInspector
              acceptedCount={acceptedCount}
              capability={selectedCapability}
              gate={gate}
              pendingCount={pendingCount}
              preferences={state.preferences}
              rightsIssueCount={countRightsIssues(state.suggestions)}
              sceneStatus={selectedScene?.status ?? "draft"}
              selectedSceneTitle={selectedScene?.title ?? "Scene"}
              sceneAdviserContext={
                selectedScene
                  ? {
                      sceneTitle: selectedScene.title,
                      sceneDescription: `${selectedScene.modelRecommendation.reason} 리스크: ${selectedScene.modelRecommendation.risk}`,
                      durationSeconds: selectedScene.durationSeconds
                    }
                  : undefined
              }
              suggestion={selectedSuggestion}
              totalCost={sumRecommendedCost(state.suggestions)}
              onAccept={() =>
                selectedSuggestion &&
                dispatch({
                  type: "decide-suggestion",
                  suggestionId: selectedSuggestion.id,
                  decision: "accepted",
                  decisionReason: "Editor approved after checking risk, cost, and alternatives."
                })
              }
              onDismiss={() =>
                selectedSuggestion &&
                dispatch({
                  type: "decide-suggestion",
                  suggestionId: selectedSuggestion.id,
                  decision: "dismissed",
                  decisionReason: "Editor held this suggestion for later."
                })
              }
              onEdit={() =>
                selectedSuggestion &&
                dispatch({
                  type: "decide-suggestion",
                  suggestionId: selectedSuggestion.id,
                  decision: "edited",
                  decisionReason: "Editor will apply this suggestion with manual changes."
                })
              }
              onSetGlobalMode={(mode) => dispatch({ type: "set-global-mode", mode })}
              onSetTaskMode={(taskId, mode) =>
                dispatch({ type: "set-task-mode", taskId, mode })
              }
            />
          ) : null}
          {state.inspectorTab === "clip" ? (
            <ClipInspector
              capability={selectedCapability}
              clip={selectedClip}
              mediaSource={selectedMediaSource}
              reports={selectedValidationReports}
              scene={selectedScene}
              spec={selectedSceneSpec}
            />
          ) : null}
          {state.inspectorTab === "export" ? (
            <ExportInspector
              manifest={state.exportManifest}
              pendingCount={pendingCount}
              profile={state.workspace.exportProfile}
              readiness={exportReadiness}
              reports={state.validationReports}
              timelineDuration={timelineDuration}
            />
          ) : null}
        </aside>

        <section className="timeline-area" data-testid="timeline-area">
          <div className="tool-rail" aria-label="Editing tools">
            {(Object.keys(TOOL_LABELS) as EditToolId[]).map((tool) => (
              <button
                aria-label={`Select ${tool} tool`}
                aria-pressed={state.workspace.activeTool === tool}
                className={state.workspace.activeTool === tool ? "active" : ""}
                data-testid={`tool-${tool}`}
                key={tool}
                onClick={() => dispatch({ type: "set-tool", tool })}
                title={tool}
                type="button"
              >
                {TOOL_LABELS[tool]}
              </button>
            ))}
          </div>
          <div className="timeline-panel">
            <div className="timeline-header">
              <div>
                <strong>Sequence 01</strong>
                <span>{state.workspace.tracks.length} tracks / {state.workspace.clips.length} clips</span>
              </div>
              <div className="timeline-actions">
                <button
                  data-testid="timeline-snap-button"
                  disabled={!selectedClip}
                  onClick={() => dispatch({ type: "snap-selected-clip" })}
                  type="button"
                >
                  Snap
                </button>
                <button disabled title="준비 중 (미구현)" type="button">Markers</button>
                <button disabled title="준비 중 (미구현)" type="button">Render Preview</button>
                <button
                  data-testid="timeline-trim-in-button"
                  disabled={!selectedClip || selectedClip.durationSeconds <= TIMELINE_MIN_TRIMMABLE_DURATION_SECONDS}
                  onClick={() => dispatch({ type: "trim-selected-clip-start" })}
                  type="button"
                >
                  Trim In
                </button>
                <button
                  data-testid="timeline-trim-out-button"
                  disabled={!selectedClip || selectedClip.durationSeconds <= TIMELINE_MIN_TRIMMABLE_DURATION_SECONDS}
                  onClick={() => dispatch({ type: "trim-selected-clip-end" })}
                  type="button"
                >
                  Trim Out
                </button>
                <button
                  data-testid="timeline-move-forward-button"
                  disabled={!selectedClip}
                  onClick={() => dispatch({ type: "move-selected-clip", direction: "forward" })}
                  type="button"
                >
                  Move +1s
                </button>
                <button
                  data-testid="timeline-roll-forward-button"
                  disabled={!selectedClip}
                  onClick={() => dispatch({ type: "roll-selected-boundary-forward" })}
                  type="button"
                >
                  Roll +0.5s
                </button>
                <button
                  data-testid="timeline-slip-forward-button"
                  disabled={!selectedClip}
                  onClick={() => dispatch({ type: "slip-selected-clip-forward" })}
                  type="button"
                >
                  Slip +0.5s
                </button>
                <button
                  data-testid="timeline-scroll-left-button"
                  disabled={timelineVisibleRange.startSeconds <= 0}
                  onClick={() => dispatch({ type: "scroll-timeline", direction: "left" })}
                  type="button"
                >
                  Scroll &lt;
                </button>
                <button
                  data-testid="timeline-scroll-right-button"
                  disabled={timelineVisibleRange.startSeconds >= timelineVisibleRange.maxScrollSeconds}
                  onClick={() => dispatch({ type: "scroll-timeline", direction: "right" })}
                  type="button"
                >
                  Scroll &gt;
                </button>
                <button
                  aria-label="Zoom timeline out"
                  data-testid="timeline-zoom-out-button"
                  onClick={() => dispatch({ type: "zoom-timeline", direction: "out" })}
                  type="button"
                >
                  Zoom -
                </button>
                <button
                  aria-label="Zoom timeline in"
                  data-testid="timeline-zoom-in-button"
                  onClick={() => dispatch({ type: "zoom-timeline", direction: "in" })}
                  type="button"
                >
                  Zoom +
                </button>
                <button
                  data-testid="timeline-split-button"
                  disabled={!selectedClip || selectedClip.durationSeconds <= 0.1}
                  onClick={() => dispatch({ type: "split-selected-clip" })}
                  type="button"
                >
                  Split
                </button>
                <button
                  data-testid="timeline-ripple-delete-button"
                  disabled={!selectedClip}
                  onClick={() => dispatch({ type: "ripple-delete-selected-clip" })}
                  type="button"
                >
                  Ripple Delete
                </button>
                <button
                  data-testid="timeline-undo-button"
                  disabled={state.timelinePast.length === 0}
                  onClick={() => dispatch({ type: "undo-timeline-edit" })}
                  type="button"
                >
                  Undo
                </button>
                <button
                  data-testid="timeline-redo-button"
                  disabled={state.timelineFuture.length === 0}
                  onClick={() => dispatch({ type: "redo-timeline-edit" })}
                  type="button"
                >
                  Redo
                </button>
              </div>
            </div>
            <div className="ruler">
              {Array.from({ length: 9 }).map((_, index) => (
                <span key={index}>
                  {formatTimecode(
                    timelineVisibleRange.startSeconds +
                      (timelineVisibleRange.durationSeconds / 8) * index
                  )}
                </span>
              ))}
            </div>
            <div
              aria-label="Timeline navigator"
              className="timeline-navigator"
              data-testid="timeline-navigator"
            >
              <div aria-hidden="true" className="timeline-minimap" data-testid="timeline-minimap">
                {state.workspace.clips.map((clip) => (
                  <span
                    className={`timeline-minimap-clip ${clip.status}`}
                    key={clip.id}
                    style={{
                      backgroundColor: clip.color,
                      left: `${timelineDuration > 0 ? (clip.startSeconds / timelineDuration) * 100 : 0}%`,
                      width: `${
                        timelineDuration > 0
                          ? (clip.durationSeconds / timelineDuration) * 100
                          : 0
                      }%`
                    }}
                  />
                ))}
                <span
                  className="timeline-minimap-window"
                  data-testid="timeline-minimap-window"
                  style={{
                    left: `${timelineWindowLeftPercent}%`,
                    width: `${timelineWindowWidthPercent}%`
                  }}
                />
              </div>
              <input
                aria-label="Timeline horizontal scroll"
                className="timeline-scrollbar"
                data-testid="timeline-scrollbar"
                disabled={timelineVisibleRange.maxScrollSeconds <= 0}
                max={timelineScrollbarMax}
                min={0}
                onChange={(event) =>
                  dispatch({
                    type: "set-timeline-scroll",
                    scrollSeconds: Number(event.currentTarget.value)
                  })
                }
                step={0.01}
                type="range"
                value={Number(state.workspace.scrollSeconds.toFixed(2))}
              />
            </div>
            <div className="track-stack">
              <div className="selection-readout" data-testid="selection-readout">
                <span>Selected</span>
                <strong>{selectedClip?.label ?? "No clip"}</strong>
                <small>{selectedScene?.title ?? "No scene"} · {selectedClip?.status ?? "offline"}</small>
                <small data-testid="timeline-zoom-readout">
                  Zoom {Math.round(state.workspace.zoom * 100)}%
                </small>
                <small data-testid="timeline-scroll-readout">
                  Window {formatTimecode(timelineVisibleRange.startSeconds)} -{" "}
                  {formatTimecode(timelineVisibleRange.endSeconds)}
                </small>
              </div>
              <div
                className="playhead"
                style={{
                  // 클립은 라벨(--track-label-width) 이후 콘텐츠 영역 기준 %로 배치되므로
                  // 플레이헤드도 라벨 폭만큼 오프셋해 클립과 동일한 좌표계로 맞춘다.
                  left: `calc(var(--track-label-width) + (100% - var(--track-label-width)) * ${
                    getTimelineViewportPercent(state.workspace.playheadSeconds) / 100
                  })`
                }}
              />
              {state.workspace.tracks.map((track) => (
                <div className="track-row" key={track.id} style={{ minHeight: track.heightPx }}>
                  <div className="track-label">
                    <strong>{track.label}</strong>
                    <span>{track.type}</span>
                  </div>
                  <div
                    className="clip-lane"
                    style={{ "--timeline-zoom": state.workspace.zoom } as React.CSSProperties}
                  >
                    <div className="clip-lane-inner">
                      {getClipsForTrack(state.workspace, track.id).map((clip) => (
                        <button
                          aria-label={`Select clip ${clip.label} on ${track.label}, starts at ${formatTimecode(
                            clip.startSeconds
                          )}, status ${clip.status}`}
                          aria-pressed={clip.id === state.selectedClipId}
                          className={`timeline-clip ${clip.id === state.selectedClipId ? "selected" : ""} ${clip.status}`}
                          data-clip-id={clip.id}
                          data-duration-seconds={clip.durationSeconds.toFixed(2)}
                          data-in-point-seconds={clip.inPointSeconds.toFixed(2)}
                          data-start-seconds={clip.startSeconds.toFixed(2)}
                          data-testid={`timeline-clip-${clip.id}`}
                          key={clip.id}
                          onClick={() => dispatch({ type: "select-clip", clip })}
                          onPointerCancel={endTimelineGesture}
                          onPointerDown={(event) => beginTimelineGesture(event, clip, "move")}
                          onPointerMove={updateTimelineGesture}
                          onPointerUp={endTimelineGesture}
                          style={{
                            left: `${getTimelineViewportPercent(clip.startSeconds)}%`,
                            width: `${(clip.durationSeconds / timelineVisibleDuration) * 100}%`,
                            borderColor: clip.color
                          }}
                          type="button"
                        >
                          <span
                            aria-hidden="true"
                            className="clip-resize-handle start"
                            data-testid={`timeline-clip-${clip.id}-resize-start`}
                            onPointerCancel={endTimelineGesture}
                            onPointerDown={(event) => beginTimelineGesture(event, clip, "trim-start")}
                            onPointerMove={updateTimelineGesture}
                            onPointerUp={endTimelineGesture}
                          />
                          {getPreviousClipOnSameTrack(state.workspace, clip) ? (
                            <span
                              aria-hidden="true"
                              className="clip-roll-handle start"
                              data-testid={`timeline-clip-${clip.id}-roll-start`}
                              onPointerCancel={endTimelineGesture}
                              onPointerDown={(event) => beginTimelineGesture(event, clip, "roll-start")}
                              onPointerMove={updateTimelineGesture}
                              onPointerUp={endTimelineGesture}
                            />
                          ) : null}
                          <span
                            aria-hidden="true"
                            className="clip-ripple-handle start"
                            data-testid={`timeline-clip-${clip.id}-ripple-start`}
                            onPointerCancel={endTimelineGesture}
                            onPointerDown={(event) => beginTimelineGesture(event, clip, "ripple-start")}
                            onPointerMove={updateTimelineGesture}
                            onPointerUp={endTimelineGesture}
                          />
                          <span>{clip.label}</span>
                          <small>{clip.status}</small>
                          <span
                            aria-hidden="true"
                            className="clip-ripple-handle end"
                            data-testid={`timeline-clip-${clip.id}-ripple-end`}
                            onPointerCancel={endTimelineGesture}
                            onPointerDown={(event) => beginTimelineGesture(event, clip, "ripple-end")}
                            onPointerMove={updateTimelineGesture}
                            onPointerUp={endTimelineGesture}
                          />
                          <span
                            aria-hidden="true"
                            className="clip-resize-handle end"
                            data-testid={`timeline-clip-${clip.id}-resize-end`}
                            onPointerCancel={endTimelineGesture}
                            onPointerDown={(event) => beginTimelineGesture(event, clip, "trim-end")}
                            onPointerMove={updateTimelineGesture}
                            onPointerUp={endTimelineGesture}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
}

function AiInspector({
  acceptedCount,
  capability,
  gate,
  onAccept,
  onDismiss,
  onEdit,
  onSetGlobalMode,
  onSetTaskMode,
  pendingCount,
  preferences,
  rightsIssueCount,
  sceneAdviserContext,
  sceneStatus,
  selectedSceneTitle,
  suggestion,
  totalCost
}: {
  acceptedCount: number;
  capability: ProviderCapability | undefined;
  gate: ReturnType<typeof evaluateSuggestionGate> | undefined;
  onAccept: () => void;
  onDismiss: () => void;
  onEdit: () => void;
  onSetGlobalMode: (mode: AiControlMode) => void;
  onSetTaskMode: (taskId: AiTaskId, mode: AiControlMode) => void;
  pendingCount: number;
  preferences: AiControlPreferences;
  rightsIssueCount: number;
  sceneAdviserContext:
    | { sceneTitle: string; sceneDescription: string; durationSeconds?: number }
    | undefined;
  sceneStatus: string;
  selectedSceneTitle: string;
  suggestion: AiSuggestion | undefined;
  totalCost: number;
}) {
  const recommendedOption = suggestion ? getRecommendedOption(suggestion) : undefined;
  // 라이브 어드바이저(DeepSeek V4 Pro · NVIDIA NIM) 호출 상태 — 요청 중/결과/실패를 구분 표시한다.
  const [liveAdvice, setLiveAdvice] = useState<SceneAdviceResult | null>(null);
  const [liveAdviceLoading, setLiveAdviceLoading] = useState(false);

  async function handleGenerateLiveAdvice() {
    if (!sceneAdviserContext || liveAdviceLoading) {
      return;
    }
    setLiveAdviceLoading(true);
    try {
      setLiveAdvice(await requestSceneAdvice(sceneAdviserContext));
    } catch {
      setLiveAdvice({ ok: false, error: "AI 어드바이저 호출에 실패했습니다." });
    } finally {
      setLiveAdviceLoading(false);
    }
  }

  return (
    <div className="inspector-body" data-testid="ai-inspector">
      <PanelTitle eyebrow="AI Adviser" title="Choice control" />
      <ContextRow label="Selected scene" value={selectedSceneTitle} />
      <ContextRow label="Scene state" value={sceneStatus} />
      <div className="mode-switch compact">
        {AI_CONTROL_MODES.map((mode) => (
          <button
            aria-label={`Set global AI mode to ${mode}`}
            aria-pressed={preferences.globalMode === mode}
            className={preferences.globalMode === mode ? "active" : ""}
            data-testid={`global-mode-${mode}`}
            key={mode}
            onClick={() => onSetGlobalMode(mode)}
            type="button"
          >
            {mode}
          </button>
        ))}
      </div>
      <div className="metric-grid">
        <MiniMetric label="Pending" testId="metric-pending" value={String(pendingCount)} />
        <MiniMetric label="Accepted" testId="metric-accepted" value={String(acceptedCount)} />
        <MiniMetric label="Cost" testId="metric-cost" value={formatUsd(totalCost)} />
        <MiniMetric label="Rights" testId="metric-rights" value={String(rightsIssueCount)} />
      </div>
      {capability ? (
        <div className="capability-strip">
          <strong>{capability.model}</strong>
          <span>{capability.bestFor.slice(0, 2).join(" / ")}</span>
          <small>
            {formatUsd(capability.estimatedCostUsd.low)}-{formatUsd(capability.estimatedCostUsd.high)} · rights {capability.rightsRisk}
          </small>
        </div>
      ) : null}

      <div className="task-accordion">
        {AI_TASK_DEFAULTS.slice(0, 5).map((task) => {
          const effectiveMode = resolveTaskMode(preferences, task.id);

          return (
            <div className="task-row" data-testid={`task-mode-${task.id}`} key={task.id}>
              <span>{task.label}</span>
              <div>
                {AI_CONTROL_MODES.map((mode) => (
                  <button
                    aria-label={`Set ${task.label} mode to ${mode}`}
                    aria-pressed={effectiveMode === mode}
                    className={effectiveMode === mode ? "active" : ""}
                    data-testid={`task-mode-${task.id}-${mode}`}
                    key={mode}
                    onClick={() => onSetTaskMode(task.id, mode)}
                    type="button"
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {suggestion && gate && recommendedOption ? (
        <section className="adviser-card">
          <div className="adviser-head">
            <span>{gate.status}</span>
            <strong>{selectedSceneTitle}</strong>
          </div>
          <h3>{suggestion.title}</h3>
          <p>{suggestion.summary}</p>
          <div className="model-choice">
            <strong>{recommendedOption.model}</strong>
            <span>{recommendedOption.provider} / {formatUsd(recommendedOption.estimatedCostUsd)}</span>
          </div>
          <div className="risk-stack">
            {suggestion.riskFlags.map((risk) => (
              <div className={`risk-pill ${risk.severity}`} key={risk.id}>
                <strong>{risk.label}</strong>
                <span>{risk.detail}</span>
              </div>
            ))}
          </div>
          <div className="gate-copy">
            {gate.reasons.map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
          <div className="choice-row">
            <button data-testid="suggestion-approve" disabled={!gate.canExecute} onClick={onAccept} type="button">Approve</button>
            <button data-testid="suggestion-edit-apply" onClick={onEdit} type="button">Edit Apply</button>
            <button data-testid="suggestion-hold" onClick={onDismiss} type="button">Hold</button>
          </div>
        </section>
      ) : (
        <section className="adviser-card empty">
          <h3>No pending AI decision</h3>
          <p>The editor can keep cutting. New AI advice appears only when requested or policy allows it.</p>
        </section>
      )}

      {/* 라이브 어드바이저 — 이 프로젝트 최초의 실 외부 AI 호출 경로 (DeepSeek V4 Pro · NVIDIA NIM) */}
      <section className="live-adviser" data-testid="live-adviser">
        <div className="live-adviser-head">
          <PanelTitle eyebrow="Live Adviser" title="DeepSeek V4 Pro" />
          <span className="live-adviser-chip">NVIDIA NIM</span>
        </div>
        <button
          className="primary"
          data-testid="adviser-generate"
          disabled={!sceneAdviserContext || liveAdviceLoading}
          onClick={handleGenerateLiveAdvice}
          title={sceneAdviserContext ? undefined : "선택된 씬이 없습니다"}
          type="button"
        >
          {liveAdviceLoading ? "제안 생성 중…" : "이 씬에 대한 제안 생성"}
        </button>
        {liveAdvice ? (
          liveAdvice.ok ? (
            <div className="live-adviser-result" data-testid="adviser-result">
              {renderLiveAdvice(liveAdvice.advice.parsed, liveAdvice.advice.rawText)}
              {liveAdvice.advice.usage ? (
                <small className="live-adviser-usage">
                  tokens {liveAdvice.advice.usage.totalTokens} (prompt {liveAdvice.advice.usage.promptTokens} / completion {liveAdvice.advice.usage.completionTokens})
                </small>
              ) : null}
            </div>
          ) : (
            <p className="live-adviser-error" data-testid="adviser-error" role="alert">
              {liveAdvice.error}
            </p>
          )
        ) : null}
      </section>
    </div>
  );
}

// DeepSeek 응답(JSON 스키마 준수 기대)을 방어적으로 렌더링한다 — 스키마 이탈 시 raw 텍스트 폴백.
function renderLiveAdvice(parsed: unknown, rawText: string) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return <pre className="live-adviser-raw">{rawText}</pre>;
  }
  const record = parsed as {
    sceneComposition?: unknown;
    promptCandidates?: unknown;
    recommendedModel?: { model?: unknown; reason?: unknown };
    risks?: Array<{ type?: unknown; detail?: unknown }>;
  };
  return (
    <>
      {typeof record.sceneComposition === "string" ? <p>{record.sceneComposition}</p> : null}
      {Array.isArray(record.promptCandidates) && record.promptCandidates.length > 0 ? (
        <ul className="live-adviser-prompts">
          {record.promptCandidates.map((candidate, index) =>
            typeof candidate === "string" ? <li key={index}>{candidate}</li> : null
          )}
        </ul>
      ) : null}
      {record.recommendedModel && typeof record.recommendedModel.model === "string" ? (
        <div className="model-choice">
          <strong>{record.recommendedModel.model}</strong>
          {typeof record.recommendedModel.reason === "string" ? (
            <span>{record.recommendedModel.reason}</span>
          ) : null}
        </div>
      ) : null}
      {Array.isArray(record.risks) && record.risks.length > 0 ? (
        <div className="risk-stack">
          {record.risks.map((risk, index) => (
            <div className="risk-pill medium" key={index}>
              <strong>{typeof risk.type === "string" ? risk.type : "risk"}</strong>
              <span>{typeof risk.detail === "string" ? risk.detail : ""}</span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

function ClipInspector({
  capability,
  clip,
  mediaSource,
  reports,
  scene,
  spec
}: {
  capability: ProviderCapability | undefined;
  clip: EditClip | undefined;
  mediaSource: SourceMediaMetadata | undefined;
  reports: ValidationReport[];
  scene: SceneDecision | undefined;
  spec: SceneSpec | undefined;
}) {
  if (!clip) {
    return <div className="inspector-body" data-testid="clip-inspector"><PanelTitle eyebrow="Clip" title="No selection" /></div>;
  }

  return (
    <div className="inspector-body" data-testid="clip-inspector">
      <PanelTitle eyebrow="Clip Inspector" title={clip.label} />
      <ContextRow label="Scene" value={scene?.title ?? "Unassigned"} />
      <ContextRow label="Source" value={clip.sourceType} />
      {clip.sourceAssetId ? (
        <ContextRow
          label="Source asset"
          testId="clip-source-asset-readout"
          value={mediaSource?.label ?? clip.sourceAssetId}
        />
      ) : null}
      <ContextRow
        label="Source duration"
        testId="clip-source-duration-readout"
        value={
          clip.sourceDurationSeconds !== undefined
            ? formatTimecode(clip.sourceDurationSeconds)
            : "unknown"
        }
      />
      <ContextRow
        label="Metadata"
        testId="clip-source-metadata-readout"
        value={mediaSource?.metadataSource ?? "not linked"}
      />
      <ContextRow
        label="Tags"
        testId="clip-source-tags-readout"
        value={formatMediaTags(mediaSource?.tags)}
      />
      <ContextRow label="Start" value={formatTimecode(clip.startSeconds)} />
      <ContextRow label="Duration" value={formatTimecode(clip.durationSeconds)} />
      <ContextRow label="Status" value={clip.status} />
      {spec ? (
        <div className="spec-card">
          <strong>SceneSpec</strong>
          <ContextRow label="Intent" value={spec.userIntent} />
          <ContextRow label="Shot" value={`${spec.cameraAngle} / ${spec.shotType}`} />
          <ContextRow label="Input" value={`${spec.providerInputMode} / ${spec.targetAspectRatio}`} />
          <ContextRow label="Approval" value={spec.approvalPolicy.requiresEditorApproval ? "editor required" : "local allowed"} />
          <ContextRow label="Budget cap" value={formatUsd(spec.approvalPolicy.maxApprovedCostUsd)} />
        </div>
      ) : null}
      {capability ? (
        <div className="spec-card">
          <strong>Provider capability</strong>
          <ContextRow label="Model" value={`${capability.provider} / ${capability.model}`} />
          <ContextRow label="Duration" value={`${capability.durationSeconds.min}-${capability.durationSeconds.max}s`} />
          <ContextRow label="References" value={capability.supportsMultiReference ? "multi-reference" : "single reference"} />
          <ContextRow label="Terms" value={capability.commercialUseAllowed ? "commercial allowed" : "review terms"} />
        </div>
      ) : null}
      <div className="validation-stack">
        <strong>Validation reports</strong>
        {reports.length > 0 ? (
          reports.map((report) => (
            <div className={`validation-report ${getValidationStatus(report)}`} key={report.id}>
              <span>{getValidationStatus(report)}</span>
              {report.checks.map((check) => (
                <small key={check.id}>
                  {check.label}: {check.status}
                  {check.blockingReason ? ` · ${check.blockingReason}` : ""}
                </small>
              ))}
            </div>
          ))
        ) : (
          <small>No validation report for this scene yet.</small>
        )}
      </div>
      <div className="effect-list">
        <strong>Effect controls</strong>
        <SliderRow label="Motion strength" value="62" />
        <SliderRow label="Style lock" value="86" />
        <SliderRow label="Camera drift" value="12" />
      </div>
    </div>
  );
}

function ExportInspector({
  manifest,
  pendingCount,
  profile,
  readiness,
  reports,
  timelineDuration
}: {
  manifest: ExportManifest;
  pendingCount: number;
  profile: EditingWorkspace["exportProfile"];
  readiness: ExportReadiness;
  reports: ValidationReport[];
  timelineDuration: number;
}) {
  const validationBlocked =
    reports.some((report) => getValidationStatus(report) === "blocked") ||
    readiness.blockers.some((blocker) => blocker.toLowerCase().includes("validation report"));
  const manifestEvidence = summarizeExportManifestEvidence(manifest, reports);

  return (
    <div className="inspector-body" data-testid="export-inspector">
      <PanelTitle eyebrow="Export Gate" title={profile.label} />
      <ContextRow label="Format" value={`${profile.format.toUpperCase()} ${profile.width}x${profile.height}`} />
      <ContextRow label="Frame rate" value={`${profile.fps} fps`} />
      <ContextRow label="Duration" value={formatTimecode(timelineDuration, profile.fps)} />
      <ContextRow label="Pending decisions" value={String(pendingCount)} />
      <ContextRow label="Readiness" value={readiness.status} />
      <div className="export-checklist">
        <span className={pendingCount === 0 ? "pass" : "warn"}>AI decisions</span>
        <span className={manifest.rights.every((entry) => entry.status === "cleared") ? "pass" : "warn"}>Rights manifest</span>
        <span className={validationBlocked ? "fail" : "pass"}>QC reports</span>
        <span className={manifest.previewRenderStatus === "ready" ? "pass" : "warn"}>Preview render</span>
      </div>
      <div className="export-blockers">
        {readiness.blockers.map((blocker) => (
          <span className="blocker" key={blocker}>{blocker}</span>
        ))}
        {readiness.warnings.map((warning) => (
          <span className="warning" key={warning}>{warning}</span>
        ))}
      </div>
      <div className="manifest-list">
        <strong>Manifest audit</strong>
        {manifest.finalDecisionAudit.map((entry) => (
          <small key={entry.id}>{entry.actorId}: {entry.decision}</small>
        ))}
      </div>
      <div className="manifest-list" data-testid="export-manifest-evidence">
        <strong>Manifest evidence</strong>
        <small>Assets: {formatEvidenceIds(manifestEvidence.assetIds)}</small>
        <small>Model runs: {formatEvidenceIds(manifestEvidence.modelRunIds)}</small>
        <small>Validation: {formatEvidenceIds(manifestEvidence.validationReportIds)}</small>
        <small>Costs: {formatEvidenceIds(manifestEvidence.costLedgerEntryIds)}</small>
        <small>Rights: {formatEvidenceIds(manifestEvidence.rightsManifestEntryIds)}</small>
        <small>Rights evidence: {formatEvidenceIds(manifestEvidence.rightsEvidenceAssetIds)}</small>
        <small>Generated label: {manifestEvidence.generatedContentLabel}</small>
        <small>Render artifact: {manifestEvidence.renderArtifactId ?? "missing"}</small>
        <small>Render checksum: {manifestEvidence.renderArtifactChecksum ?? "missing"}</small>
        <small>Source hash: {manifestEvidence.renderArtifactSourceManifestHash ?? "missing"}</small>
        <small>Artifact URI: {manifestEvidence.renderArtifactUri ?? "missing"}</small>
        <small>C2PA: {manifestEvidence.c2paStatus}</small>
        <small>C2PA attachment: {manifestEvidence.c2paAttachmentStatus}</small>
        <small>C2PA verification: {manifestEvidence.c2paAttachmentVerificationStatus ?? "missing"}</small>
        <small>C2PA policy: {manifestEvidence.c2paAttachmentPolicy ?? "missing"}</small>
        <small>C2PA signature: {manifestEvidence.c2paSignatureAlgorithm ?? "missing"}</small>
        <small>C2PA signed by: {manifestEvidence.c2paSignedBy ?? "missing"}</small>
        <small>C2PA manifest hash: {manifestEvidence.c2paManifestHash ?? "missing"}</small>
      </div>
      <button
        className="export-button"
        data-testid="export-master-button"
        disabled={readiness.status !== "ready"}
        title={
          readiness.status === "ready"
            ? undefined
            : `내보내기 차단: 미해결 항목 ${readiness.blockers.length}건`
        }
        type="button"
      >
        Export master
      </button>
    </div>
  );
}

function Monitor({
  children,
  label,
  meta,
  testId,
  title
}: {
  children: React.ReactNode;
  label: string;
  meta: string;
  testId: string;
  title: string;
}) {
  return (
    <section className="monitor-panel" data-testid={testId}>
      <div className="monitor-title">
        <span>{label}</span>
        <strong>{title}</strong>
        <small>{meta}</small>
      </div>
      {children}
    </section>
  );
}

function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="panel-title">
      <span>{eyebrow}</span>
      <strong>{title}</strong>
    </div>
  );
}

function formatMediaSourceMeta(source: SourceMediaMetadata): string {
  const tags = formatMediaTags(source.tags);
  return `${source.metadataSource} / ${formatTimecode(source.durationSeconds)} / ${tags}`;
}

function formatMediaTags(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) {
    return "untagged";
  }

  return tags.join(", ");
}

function formatEvidenceIds(ids: string[]): string {
  if (ids.length === 0) {
    return "missing";
  }

  return ids.join(", ");
}

function readPersistedImportedMediaSources(): SourceMediaMetadata[] {
  try {
    const rawSources = window.localStorage.getItem(IMPORTED_MEDIA_STORAGE_KEY);

    if (!rawSources) {
      return [];
    }

    const parsed = JSON.parse(rawSources) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((source) => {
      const parsedSource = parsePersistedMediaSource(source);
      return parsedSource ? [parsedSource] : [];
    });
  } catch {
    return [];
  }
}

function parsePersistedMediaSource(source: unknown): SourceMediaMetadata | undefined {
  if (!isRecord(source)) {
    return undefined;
  }

  if (
    typeof source.id !== "string" ||
    typeof source.label !== "string" ||
    typeof source.sourceType !== "string" ||
    !isClipSourceType(source.sourceType) ||
    typeof source.durationSeconds !== "number" ||
    !Number.isFinite(source.durationSeconds) ||
    typeof source.metadataSource !== "string" ||
    !isMediaMetadataSource(source.metadataSource)
  ) {
    return undefined;
  }

  return {
    id: source.id,
    label: source.label,
    sourceType: source.sourceType,
    durationSeconds: Math.max(0, source.durationSeconds),
    metadataSource: source.metadataSource,
    storageUri: typeof source.storageUri === "string" ? source.storageUri : undefined,
    tags: Array.isArray(source.tags)
      ? source.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    thumbnailLabel:
      typeof source.thumbnailLabel === "string" ? source.thumbnailLabel.slice(0, 6) : undefined
  };
}

function createImportedMediaSource(file: File): SourceMediaMetadata {
  const sourceType = inferImportedSourceType(file);
  const label = createImportedMediaLabel(file);

  return {
    id: createImportedMediaSourceId(file),
    label,
    sourceType,
    durationSeconds: IMPORTED_MEDIA_DEFAULT_DURATION_SECONDS[sourceType],
    metadataSource: "file-probe",
    storageUri: `browser-local://imports/${encodeURIComponent(file.name)}`,
    tags: inferImportedMediaTags(file, sourceType, label),
    thumbnailLabel: createMediaThumbnailLabel(label, sourceType)
  };
}

function createImportedMediaSourceId(file: File): string {
  return `${IMPORTED_MEDIA_ID_PREFIX}${slugifyImportedMediaName(file.name)}-${file.size}`;
}

function createImportedMediaLabel(file: File): string {
  const withoutExtension = file.name.replace(/\.[^.]+$/, "");
  return withoutExtension.replace(/[-_]+/g, " ").trim() || "imported media";
}

function slugifyImportedMediaName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const slug = withoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "media";
}

function inferImportedSourceType(file: File): ImportedMediaSourceType {
  const lowerName = file.name.toLowerCase();

  if (file.type.startsWith("audio/") || /\.(aac|aif|aiff|flac|mp3|ogg|wav)$/.test(lowerName)) {
    return "uploaded-audio";
  }

  if (
    file.type.startsWith("image/") ||
    /\.(avif|gif|jpeg|jpg|png|tif|tiff|webp)$/.test(lowerName)
  ) {
    return "uploaded-image";
  }

  return "uploaded-video";
}

function inferImportedMediaTags(
  file: File,
  sourceType: ImportedMediaSourceType,
  label: string
): string[] {
  const tokens = new Set<string>(["imported"]);
  const lowerName = `${file.name} ${label}`.toLowerCase();

  if (sourceType === "uploaded-video") {
    tokens.add("video");
  } else if (sourceType === "uploaded-audio") {
    tokens.add("audio");
  } else {
    tokens.add("image");
  }

  for (const candidate of ["noir", "reference", "take", "rain", "voice", "style"]) {
    if (lowerName.includes(candidate)) {
      tokens.add(candidate);
    }
  }

  return Array.from(tokens).slice(0, 6);
}

function createMediaThumbnailLabel(label: string, sourceType: ClipSourceType): string {
  const words = label
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length > 0) {
    return words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 4);
  }

  if (sourceType.includes("audio")) {
    return "AUD";
  }

  if (sourceType.includes("image")) {
    return "IMG";
  }

  return "VID";
}

function getMediaTagOptions(sources: SourceMediaMetadata[]): string[] {
  return Array.from(new Set(sources.flatMap((source) => source.tags ?? []))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function filterMediaSources(
  sources: SourceMediaMetadata[],
  query: string,
  tagFilter: string
): SourceMediaMetadata[] {
  const normalizedQuery = query.trim().toLowerCase();

  return sources.filter((source) => {
    const tags = source.tags ?? [];
    const matchesTag = !tagFilter || tags.includes(tagFilter);
    const searchableText = [
      source.label,
      source.sourceType,
      source.metadataSource,
      source.storageUri ?? "",
      tags.join(" ")
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = normalizedQuery.length === 0 || searchableText.includes(normalizedQuery);

    return matchesTag && matchesQuery;
  });
}

function mergeMediaSources(
  existingSources: SourceMediaMetadata[],
  incomingSources: SourceMediaMetadata[]
): SourceMediaMetadata[] {
  const sourceIds = new Set(existingSources.map((source) => source.id));
  const mergedSources = [...existingSources];

  for (const source of incomingSources) {
    if (!sourceIds.has(source.id)) {
      sourceIds.add(source.id);
      mergedSources.push(source);
    }
  }

  return mergedSources;
}

function isImportedMediaSource(source: SourceMediaMetadata): boolean {
  return (
    source.id.startsWith(IMPORTED_MEDIA_ID_PREFIX) ||
    source.storageUri?.startsWith("browser-local://imports/") === true
  );
}

function isClipSourceType(sourceType: string): sourceType is ClipSourceType {
  return CLIP_SOURCE_TYPES.some((candidate) => candidate === sourceType);
}

function isMediaMetadataSource(
  metadataSource: string
): metadataSource is SourceMediaMetadata["metadataSource"] {
  return (
    metadataSource === "file-probe" ||
    metadataSource === "provider-result" ||
    metadataSource === "manual-entry"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getAssetTone(index: number): AssetTileTone {
  return ASSET_TILE_TONES[index % ASSET_TILE_TONES.length];
}

function AssetTile({
  active = false,
  label,
  meta,
  onClick,
  tags,
  testId,
  thumbnailLabel,
  tone
}: {
  active?: boolean;
  label: string;
  meta: string;
  onClick?: () => void;
  tags?: string[];
  testId?: string;
  thumbnailLabel?: string;
  tone: AssetTileTone;
}) {
  return (
    <button
      aria-pressed={onClick ? active : undefined}
      className={`asset-tile ${tone}${active ? " active" : ""}`}
      data-testid={testId}
      onClick={onClick}
      type="button"
    >
      {thumbnailLabel ? <i className="asset-thumb">{thumbnailLabel}</i> : null}
      <span>{label}</span>
      <small>{meta}</small>
      {tags && tags.length > 0 ? <em>{tags.slice(0, 3).join(" / ")}</em> : null}
    </button>
  );
}

function ContextRow({ label, testId, value }: { label: string; testId?: string; value: string }) {
  return (
    <div className="context-row" data-testid={testId}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MiniMetric({ label, testId, value }: { label: string; testId?: string; value: string }) {
  return (
    <div className="mini-metric" data-testid={testId}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SliderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="slider-row">
      <span>{label}</span>
      <div><i style={{ width: `${value}%` }} /></div>
      <strong>{value}</strong>
    </div>
  );
}
