export const EDIT_TRACK_TYPES = ["video", "audio", "image", "subtitle", "ai"] as const;

const DEFAULT_TIMELINE_SNAP_THRESHOLD_SECONDS = 0.15;
const TIMELINE_MIN_CLIP_DURATION_SECONDS = 0.1;
const TIMELINE_EDGE_EPSILON_SECONDS = 0.0001;
const TIMELINE_MIN_ZOOM = 0.5;
const TIMELINE_MAX_ZOOM = 4;

export type EditTrackType = (typeof EDIT_TRACK_TYPES)[number];

export type ClipSourceType =
  | "generated-video"
  | "generated-image"
  | "uploaded-video"
  | "uploaded-image"
  | "uploaded-audio"
  | "text"
  | "adjustment";

export type ClipStatus =
  | "offline"
  | "draft"
  | "ready"
  | "needs-review"
  | "rendering"
  | "rendered";

export type EditToolId =
  | "select"
  | "trim"
  | "blade"
  | "slip"
  | "hand"
  | "text"
  | "pin";

export interface EditTrack {
  id: string;
  type: EditTrackType;
  label: string;
  locked: boolean;
  muted: boolean;
  heightPx: number;
}

export interface EditClip {
  id: string;
  trackId: string;
  sceneId: string | null;
  sourceAssetId?: string;
  sourceType: ClipSourceType;
  label: string;
  startSeconds: number;
  durationSeconds: number;
  inPointSeconds: number;
  sourceDurationSeconds?: number;
  status: ClipStatus;
  color: string;
  linkedClipIds: string[];
}

export interface ClipEffect {
  id: string;
  clipId: string;
  label: string;
  enabled: boolean;
  parameters: Record<string, number | string | boolean>;
}

export interface ExportProfile {
  id: string;
  label: string;
  format: "mp4" | "mov" | "webm";
  width: number;
  height: number;
  fps: number;
  videoBitrateMbps: number;
  audioBitrateKbps: number;
}

export interface EditingWorkspace {
  activeTool: EditToolId;
  playheadSeconds: number;
  scrollSeconds: number;
  zoom: number;
  tracks: EditTrack[];
  clips: EditClip[];
  effects: ClipEffect[];
  exportProfile: ExportProfile;
}

export interface SourceMediaMetadata {
  id: string;
  label: string;
  sourceType: ClipSourceType;
  durationSeconds: number;
  metadataSource: "file-probe" | "provider-result" | "manual-entry";
  storageUri?: string;
  tags?: string[];
  thumbnailLabel?: string;
}

export interface TimelineHistory {
  past: EditingWorkspace[];
  present: EditingWorkspace;
  future: EditingWorkspace[];
}

export type TimelineEditOperation = (workspace: EditingWorkspace) => EditingWorkspace;

export interface TimelineSnapOptions {
  enabled?: boolean;
  thresholdSeconds?: number;
  includePlayhead?: boolean;
  includeClipEdges?: boolean;
  excludedClipIds?: string[];
}

export interface TimelineLinkedEditOptions {
  editLinkedClips?: boolean;
  snap?: TimelineSnapOptions;
}

export interface TimelineSlipOptions extends TimelineLinkedEditOptions {
  minInPointSeconds?: number;
  maxInPointSeconds?: number;
}

export interface TimelineZoomOptions {
  minZoom?: number;
  maxZoom?: number;
}

export interface TimelineScrollOptions {
  timelineDurationSeconds?: number;
}

export interface TimelineVisibleRange {
  durationSeconds: number;
  endSeconds: number;
  maxScrollSeconds: number;
  startSeconds: number;
}

export class TimelineEditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimelineEditError";
  }
}

export function getTimelineDurationSeconds(workspace: EditingWorkspace): number {
  return workspace.clips.reduce(
    (duration, clip) => Math.max(duration, clip.startSeconds + clip.durationSeconds),
    0
  );
}

export function getClipsForTrack(workspace: EditingWorkspace, trackId: string): EditClip[] {
  return workspace.clips
    .filter((clip) => clip.trackId === trackId)
    .sort((a, b) => a.startSeconds - b.startSeconds);
}

export function getClipAtPlayhead(workspace: EditingWorkspace): EditClip | undefined {
  return workspace.clips.find(
    (clip) =>
      workspace.playheadSeconds >= clip.startSeconds &&
      workspace.playheadSeconds < clip.startSeconds + clip.durationSeconds
  );
}

export function hydrateWorkspaceSourceDurations(
  workspace: EditingWorkspace,
  mediaSources: SourceMediaMetadata[]
): EditingWorkspace {
  const sourcesById = new Map(mediaSources.map((source) => [source.id, source]));

  return {
    ...workspace,
    clips: workspace.clips.map((clip) => {
      if (!clip.sourceAssetId) {
        return clip;
      }

      const source = sourcesById.get(clip.sourceAssetId);

      if (!source) {
        return clip;
      }

      return {
        ...clip,
        sourceDurationSeconds: source.durationSeconds,
        sourceType: source.sourceType
      };
    })
  };
}

export function formatTimecode(seconds: number, fps = 24): string {
  const safeSeconds = Math.max(0, seconds);
  const totalFrames = Math.round(safeSeconds * fps);
  const frames = totalFrames % fps;
  const totalWholeSeconds = Math.floor(totalFrames / fps);
  const secs = totalWholeSeconds % 60;
  const totalMinutes = Math.floor(totalWholeSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  return [hours, minutes, secs, frames]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function splitClipAtTime(
  workspace: EditingWorkspace,
  clipId: string,
  splitSeconds: number,
  rightClipId = createSplitClipId(clipId, splitSeconds)
): EditingWorkspace {
  const clip = findEditableClip(workspace, clipId);
  const clipEndSeconds = clip.startSeconds + clip.durationSeconds;

  if (splitSeconds <= clip.startSeconds || splitSeconds >= clipEndSeconds) {
    throw new TimelineEditError("Split point must be inside the clip bounds.");
  }

  if (workspace.clips.some((candidate) => candidate.id === rightClipId)) {
    throw new TimelineEditError("Split would create a duplicate clip id.");
  }

  const leftDurationSeconds = splitSeconds - clip.startSeconds;
  const rightDurationSeconds = clipEndSeconds - splitSeconds;
  const rightClip: EditClip = {
    ...clip,
    id: rightClipId,
    startSeconds: splitSeconds,
    durationSeconds: rightDurationSeconds,
    inPointSeconds: clip.inPointSeconds + leftDurationSeconds
  };

  return {
    ...workspace,
    clips: sortClipsByTrackAndStart(
      workspace.clips.flatMap((candidate) =>
        candidate.id === clipId
          ? [{ ...candidate, durationSeconds: leftDurationSeconds }, rightClip]
          : [candidate]
      ),
      workspace.tracks
    ),
    playheadSeconds: splitSeconds,
    activeTool: "select"
  };
}

export function splitClipAtPlayhead(
  workspace: EditingWorkspace,
  clipId = getClipAtPlayhead(workspace)?.id
): EditingWorkspace {
  if (!clipId) {
    throw new TimelineEditError("No clip exists at the current playhead.");
  }

  return splitClipAtTime(workspace, clipId, workspace.playheadSeconds);
}

export function rippleDeleteClip(workspace: EditingWorkspace, clipId: string): EditingWorkspace {
  const clip = findEditableClip(workspace, clipId);
  const deletedStartSeconds = clip.startSeconds;
  const deletedEndSeconds = clip.startSeconds + clip.durationSeconds;

  return {
    ...workspace,
    clips: sortClipsByTrackAndStart(
      workspace.clips
        .filter((candidate) => candidate.id !== clipId)
        .map((candidate) =>
          candidate.trackId === clip.trackId && candidate.startSeconds >= deletedEndSeconds
            ? {
                ...candidate,
                startSeconds: Math.max(deletedStartSeconds, candidate.startSeconds - clip.durationSeconds)
              }
            : candidate
        ),
      workspace.tracks
    ),
    playheadSeconds: deletedStartSeconds,
    activeTool: "select"
  };
}

export function trimClipStart(
  workspace: EditingWorkspace,
  clipId: string,
  startSeconds: number,
  options: TimelineLinkedEditOptions = {}
): EditingWorkspace {
  const clip = findEditableClip(workspace, clipId);
  const affectedClipIds = getAffectedClipIds(workspace, clip, "start", options);
  const affectedClipIdSet = new Set(affectedClipIds);
  const nextStartSeconds = resolveSnappedTimelineSeconds(workspace, startSeconds, {
    ...options.snap,
    excludedClipIds: mergeExcludedClipIds(options.snap?.excludedClipIds, affectedClipIds)
  });
  const deltaSeconds = nextStartSeconds - clip.startSeconds;

  if (nextStartSeconds <= clip.startSeconds) {
    throw new TimelineEditError("Trim start must move forward.");
  }

  if (nextStartSeconds >= getClipEndSeconds(clip) - TIMELINE_MIN_CLIP_DURATION_SECONDS) {
    throw new TimelineEditError("Trim would make the clip too short.");
  }

  const clips = sortClipsByTrackAndStart(
    workspace.clips.map((candidate) =>
      affectedClipIdSet.has(candidate.id)
        ? {
            ...candidate,
            startSeconds: candidate.startSeconds + deltaSeconds,
            durationSeconds: candidate.durationSeconds - deltaSeconds,
            inPointSeconds: candidate.inPointSeconds + deltaSeconds
          }
        : candidate
    ),
    workspace.tracks
  );

  assertNoTrackOverlap(clips);

  return {
    ...workspace,
    clips,
    playheadSeconds: nextStartSeconds,
    activeTool: "trim"
  };
}

export function trimClipEnd(
  workspace: EditingWorkspace,
  clipId: string,
  endSeconds: number,
  options: TimelineLinkedEditOptions = {}
): EditingWorkspace {
  const clip = findEditableClip(workspace, clipId);
  const affectedClipIds = getAffectedClipIds(workspace, clip, "end", options);
  const affectedClipIdSet = new Set(affectedClipIds);
  const nextEndSeconds = resolveSnappedTimelineSeconds(workspace, endSeconds, {
    ...options.snap,
    excludedClipIds: mergeExcludedClipIds(options.snap?.excludedClipIds, affectedClipIds)
  });
  const deltaSeconds = nextEndSeconds - getClipEndSeconds(clip);

  if (nextEndSeconds <= clip.startSeconds + TIMELINE_MIN_CLIP_DURATION_SECONDS) {
    throw new TimelineEditError("Trim would make the clip too short.");
  }

  for (const affectedClipId of affectedClipIds) {
    const affectedClip = findEditableClip(workspace, affectedClipId);
    assertClipSourceRange(
      affectedClip,
      affectedClip.inPointSeconds,
      affectedClip.durationSeconds + deltaSeconds,
      "Trim would exceed the available source duration."
    );
  }

  const clips = sortClipsByTrackAndStart(
    workspace.clips.map((candidate) =>
      affectedClipIdSet.has(candidate.id)
        ? {
            ...candidate,
            durationSeconds: candidate.durationSeconds + deltaSeconds
          }
        : candidate
    ),
    workspace.tracks
  );

  assertNoTrackOverlap(clips);

  return {
    ...workspace,
    clips,
    playheadSeconds: nextEndSeconds,
    activeTool: "trim"
  };
}

export function rippleTrimClipStart(
  workspace: EditingWorkspace,
  clipId: string,
  startSeconds: number,
  options: TimelineLinkedEditOptions = {}
): EditingWorkspace {
  const clip = findEditableClip(workspace, clipId);
  const currentEndSeconds = getClipEndSeconds(clip);
  const startAffectedClipIds = getAffectedClipIds(workspace, clip, "start", options);
  const endAffectedClipIds = getAffectedClipIds(workspace, clip, "end", options);
  const affectedClipIds = [...new Set([...startAffectedClipIds, ...endAffectedClipIds])];
  const downstreamClipIds = workspace.clips
    .filter(
      (candidate) =>
        !affectedClipIds.includes(candidate.id) &&
        candidate.startSeconds >= currentEndSeconds - TIMELINE_EDGE_EPSILON_SECONDS
    )
    .map((candidate) => candidate.id);
  const allMutatedClipIds = [...affectedClipIds, ...downstreamClipIds];
  const nextStartSeconds = resolveSnappedTimelineSeconds(workspace, startSeconds, {
    ...options.snap,
    excludedClipIds: mergeExcludedClipIds(options.snap?.excludedClipIds, allMutatedClipIds)
  });
  const deltaSeconds = nextStartSeconds - clip.startSeconds;
  const nextDurationSeconds = clip.durationSeconds - deltaSeconds;

  if (nextStartSeconds <= clip.startSeconds + TIMELINE_EDGE_EPSILON_SECONDS) {
    throw new TimelineEditError("Ripple trim start must move forward.");
  }

  if (nextDurationSeconds <= TIMELINE_MIN_CLIP_DURATION_SECONDS) {
    throw new TimelineEditError("Ripple trim would make the clip too short.");
  }

  for (const affectedClipId of affectedClipIds) {
    const affectedClip = findEditableClip(workspace, affectedClipId);
    const nextInPointSeconds = startAffectedClipIds.includes(affectedClipId)
      ? affectedClip.inPointSeconds + deltaSeconds
      : affectedClip.inPointSeconds;
    const nextAffectedDurationSeconds = affectedClip.durationSeconds - deltaSeconds;

    if (nextAffectedDurationSeconds <= TIMELINE_MIN_CLIP_DURATION_SECONDS) {
      throw new TimelineEditError("Ripple trim would make the clip too short.");
    }

    assertClipSourceRange(
      affectedClip,
      nextInPointSeconds,
      nextAffectedDurationSeconds,
      "Ripple trim would exceed the available source duration."
    );
  }

  for (const downstreamClipId of downstreamClipIds) {
    const downstreamClip = findEditableClip(workspace, downstreamClipId);

    if (downstreamClip.startSeconds - deltaSeconds < -TIMELINE_EDGE_EPSILON_SECONDS) {
      throw new TimelineEditError("Ripple trim cannot move clips before the timeline begins.");
    }
  }

  const startAffectedClipIdSet = new Set(startAffectedClipIds);
  const affectedClipIdSet = new Set(affectedClipIds);
  const downstreamClipIdSet = new Set(downstreamClipIds);
  const clips = sortClipsByTrackAndStart(
    workspace.clips.map((candidate) => {
      if (affectedClipIdSet.has(candidate.id)) {
        return {
          ...candidate,
          durationSeconds: candidate.durationSeconds - deltaSeconds,
          inPointSeconds: startAffectedClipIdSet.has(candidate.id)
            ? candidate.inPointSeconds + deltaSeconds
            : candidate.inPointSeconds
        };
      }

      if (downstreamClipIdSet.has(candidate.id)) {
        return {
          ...candidate,
          startSeconds: candidate.startSeconds - deltaSeconds
        };
      }

      return candidate;
    }),
    workspace.tracks
  );

  assertNoTrackOverlap(clips);

  return {
    ...workspace,
    clips,
    playheadSeconds: clip.startSeconds,
    activeTool: "trim"
  };
}

export function rippleTrimClipEnd(
  workspace: EditingWorkspace,
  clipId: string,
  endSeconds: number,
  options: TimelineLinkedEditOptions = {}
): EditingWorkspace {
  const clip = findEditableClip(workspace, clipId);
  const currentEndSeconds = getClipEndSeconds(clip);
  const affectedClipIds = getAffectedClipIds(workspace, clip, "end", options);
  const downstreamClipIds = workspace.clips
    .filter(
      (candidate) =>
        !affectedClipIds.includes(candidate.id) &&
        candidate.startSeconds >= currentEndSeconds - TIMELINE_EDGE_EPSILON_SECONDS
    )
    .map((candidate) => candidate.id);
  const allMutatedClipIds = [...affectedClipIds, ...downstreamClipIds];
  const nextEndSeconds = resolveSnappedTimelineSeconds(workspace, endSeconds, {
    ...options.snap,
    excludedClipIds: mergeExcludedClipIds(options.snap?.excludedClipIds, allMutatedClipIds)
  });
  const nextDurationSeconds = nextEndSeconds - clip.startSeconds;

  if (nextDurationSeconds <= TIMELINE_MIN_CLIP_DURATION_SECONDS) {
    throw new TimelineEditError("Ripple trim would make the clip too short.");
  }

  const deltaSeconds = nextEndSeconds - currentEndSeconds;

  if (almostEqual(deltaSeconds, 0)) {
    return workspace;
  }

  for (const affectedClipId of affectedClipIds) {
    const affectedClip = findEditableClip(workspace, affectedClipId);
    assertClipSourceRange(
      affectedClip,
      affectedClip.inPointSeconds,
      affectedClip.durationSeconds + deltaSeconds,
      "Ripple trim would exceed the available source duration."
    );
  }

  for (const downstreamClipId of downstreamClipIds) {
    const downstreamClip = findEditableClip(workspace, downstreamClipId);

    if (downstreamClip.startSeconds + deltaSeconds < -TIMELINE_EDGE_EPSILON_SECONDS) {
      throw new TimelineEditError("Ripple trim cannot move clips before the timeline begins.");
    }
  }

  const affectedClipIdSet = new Set(affectedClipIds);
  const downstreamClipIdSet = new Set(downstreamClipIds);
  const clips = sortClipsByTrackAndStart(
    workspace.clips.map((candidate) => {
      if (affectedClipIdSet.has(candidate.id)) {
        return {
          ...candidate,
          durationSeconds: candidate.durationSeconds + deltaSeconds
        };
      }

      if (downstreamClipIdSet.has(candidate.id)) {
        return {
          ...candidate,
          startSeconds: candidate.startSeconds + deltaSeconds
        };
      }

      return candidate;
    }),
    workspace.tracks
  );

  assertNoTrackOverlap(clips);

  return {
    ...workspace,
    clips,
    playheadSeconds: nextEndSeconds,
    activeTool: "trim"
  };
}

export function moveClipToTime(
  workspace: EditingWorkspace,
  clipId: string,
  startSeconds: number,
  options: TimelineLinkedEditOptions = {}
): EditingWorkspace {
  const clip = findEditableClip(workspace, clipId);
  const affectedClipIds = getAffectedClipIds(workspace, clip, "move", options);
  const affectedClipIdSet = new Set(affectedClipIds);
  const nextStartSeconds = resolveSnappedTimelineSeconds(workspace, startSeconds, {
    ...options.snap,
    excludedClipIds: mergeExcludedClipIds(options.snap?.excludedClipIds, affectedClipIds)
  });
  const deltaSeconds = nextStartSeconds - clip.startSeconds;

  if (nextStartSeconds < 0) {
    throw new TimelineEditError("Clip cannot start before the timeline begins.");
  }

  const clips = sortClipsByTrackAndStart(
    workspace.clips.map((candidate) =>
      affectedClipIdSet.has(candidate.id)
        ? {
            ...candidate,
            startSeconds: candidate.startSeconds + deltaSeconds
          }
        : candidate
    ),
    workspace.tracks
  );

  assertNoTrackOverlap(clips);

  return {
    ...workspace,
    clips,
    playheadSeconds: nextStartSeconds,
    activeTool: "select"
  };
}

export function snapClipStartToPreviousBoundary(
  workspace: EditingWorkspace,
  clipId: string,
  options: TimelineLinkedEditOptions = {}
): EditingWorkspace {
  const clip = findEditableClip(workspace, clipId);
  const previousBoundary = workspace.clips
    .filter((candidate) => candidate.id !== clip.id)
    .flatMap((candidate) => [candidate.startSeconds, getClipEndSeconds(candidate)])
    .filter((boundary) => boundary <= clip.startSeconds - TIMELINE_EDGE_EPSILON_SECONDS)
    .sort((a, b) => b - a)[0];

  if (previousBoundary === undefined) {
    return workspace;
  }

  return moveClipToTime(workspace, clipId, previousBoundary, {
    ...options,
    snap: {
      ...options.snap,
      enabled: false
    }
  });
}

export function rollEditBoundary(
  workspace: EditingWorkspace,
  leftClipId: string,
  rightClipId: string,
  boundarySeconds: number,
  options: TimelineLinkedEditOptions = {}
): EditingWorkspace {
  const leftClip = findEditableClip(workspace, leftClipId);
  const rightClip = findEditableClip(workspace, rightClipId);
  const leftEndSeconds = getClipEndSeconds(leftClip);

  if (leftClip.trackId !== rightClip.trackId || !almostEqual(leftEndSeconds, rightClip.startSeconds)) {
    throw new TimelineEditError("Rolling edit requires adjacent clips on the same track.");
  }

  const leftAffectedClipIds = getAffectedClipIds(workspace, leftClip, "end", options);
  const rightAffectedClipIds = getAffectedClipIds(workspace, rightClip, "start", options);
  const allAffectedClipIds = [...leftAffectedClipIds, ...rightAffectedClipIds];
  const nextBoundarySeconds = resolveSnappedTimelineSeconds(workspace, boundarySeconds, {
    ...options.snap,
    excludedClipIds: mergeExcludedClipIds(options.snap?.excludedClipIds, allAffectedClipIds)
  });

  if (nextBoundarySeconds <= leftClip.startSeconds + TIMELINE_MIN_CLIP_DURATION_SECONDS) {
    throw new TimelineEditError("Rolling edit would make the left clip too short.");
  }

  if (nextBoundarySeconds >= getClipEndSeconds(rightClip) - TIMELINE_MIN_CLIP_DURATION_SECONDS) {
    throw new TimelineEditError("Rolling edit would make the right clip too short.");
  }

  const leftDeltaSeconds = nextBoundarySeconds - leftEndSeconds;
  const rightDeltaSeconds = nextBoundarySeconds - rightClip.startSeconds;

  for (const affectedClipId of leftAffectedClipIds) {
    const affectedClip = findEditableClip(workspace, affectedClipId);
    assertClipSourceRange(
      affectedClip,
      affectedClip.inPointSeconds,
      affectedClip.durationSeconds + leftDeltaSeconds,
      "Rolling edit would exceed the available source duration."
    );
  }

  for (const affectedClipId of rightAffectedClipIds) {
    const affectedClip = findEditableClip(workspace, affectedClipId);
    assertClipSourceRange(
      affectedClip,
      affectedClip.inPointSeconds + rightDeltaSeconds,
      affectedClip.durationSeconds - rightDeltaSeconds,
      "Rolling edit would exceed the available source duration."
    );
  }

  const leftAffectedClipIdSet = new Set(leftAffectedClipIds);
  const rightAffectedClipIdSet = new Set(rightAffectedClipIds);
  const clips = sortClipsByTrackAndStart(
    workspace.clips.map((candidate) => {
      if (leftAffectedClipIdSet.has(candidate.id)) {
        return {
          ...candidate,
          durationSeconds: candidate.durationSeconds + leftDeltaSeconds
        };
      }

      if (rightAffectedClipIdSet.has(candidate.id)) {
        return {
          ...candidate,
          startSeconds: candidate.startSeconds + rightDeltaSeconds,
          durationSeconds: candidate.durationSeconds - rightDeltaSeconds,
          inPointSeconds: candidate.inPointSeconds + rightDeltaSeconds
        };
      }

      return candidate;
    }),
    workspace.tracks
  );

  assertNoTrackOverlap(clips);

  return {
    ...workspace,
    clips,
    playheadSeconds: nextBoundarySeconds,
    activeTool: "trim"
  };
}

export function slipClipInPoint(
  workspace: EditingWorkspace,
  clipId: string,
  deltaSeconds: number,
  options: TimelineSlipOptions = {}
): EditingWorkspace {
  const clip = findEditableClip(workspace, clipId);
  const affectedClipIds = getAffectedClipIds(workspace, clip, "move", options);
  const affectedClipIdSet = new Set(affectedClipIds);
  const minInPointSeconds = options.minInPointSeconds ?? 0;

  for (const affectedClipId of affectedClipIds) {
    const affectedClip = findEditableClip(workspace, affectedClipId);
    const maxInPointSeconds =
      options.maxInPointSeconds ??
      (affectedClip.sourceDurationSeconds === undefined
        ? Number.POSITIVE_INFINITY
        : affectedClip.sourceDurationSeconds - affectedClip.durationSeconds);
    const nextInPointSeconds = affectedClip.inPointSeconds + deltaSeconds;

    if (nextInPointSeconds < minInPointSeconds) {
      throw new TimelineEditError("Slip edit cannot move before the source starts.");
    }

    if (nextInPointSeconds > maxInPointSeconds) {
      throw new TimelineEditError("Slip edit exceeds the available source duration.");
    }

    assertClipSourceRange(
      affectedClip,
      nextInPointSeconds,
      affectedClip.durationSeconds,
      "Slip edit exceeds the available source duration."
    );
  }

  return {
    ...workspace,
    clips: workspace.clips.map((candidate) =>
      affectedClipIdSet.has(candidate.id)
        ? {
            ...candidate,
            inPointSeconds: candidate.inPointSeconds + deltaSeconds
          }
        : candidate
    ),
    activeTool: "slip"
  };
}

export function setTimelineZoom(
  workspace: EditingWorkspace,
  zoom: number,
  options: TimelineZoomOptions = {}
): EditingWorkspace {
  const minZoom = options.minZoom ?? TIMELINE_MIN_ZOOM;
  const maxZoom = options.maxZoom ?? TIMELINE_MAX_ZOOM;
  const nextZoom = Math.min(maxZoom, Math.max(minZoom, zoom));

  const nextWorkspace = {
    ...workspace,
    zoom: Number(nextZoom.toFixed(2))
  };

  return setTimelineScroll(nextWorkspace, nextWorkspace.scrollSeconds);
}

export function setTimelineScroll(
  workspace: EditingWorkspace,
  scrollSeconds: number,
  options: TimelineScrollOptions = {}
): EditingWorkspace {
  const timelineDurationSeconds =
    options.timelineDurationSeconds ?? getTimelineDurationSeconds(workspace);
  const visibleRange = getTimelineVisibleRange(
    {
      ...workspace,
      scrollSeconds: 0
    },
    timelineDurationSeconds
  );
  const nextScrollSeconds = Math.min(
    visibleRange.maxScrollSeconds,
    Math.max(0, scrollSeconds)
  );

  return {
    ...workspace,
    scrollSeconds: Number(nextScrollSeconds.toFixed(2))
  };
}

export function getTimelineVisibleRange(
  workspace: EditingWorkspace,
  timelineDurationSeconds = getTimelineDurationSeconds(workspace)
): TimelineVisibleRange {
  const safeTimelineDurationSeconds = Math.max(0, timelineDurationSeconds);
  const safeZoom = Math.max(TIMELINE_MIN_ZOOM, workspace.zoom);
  const durationSeconds =
    safeZoom <= 1
      ? safeTimelineDurationSeconds
      : safeTimelineDurationSeconds / safeZoom;
  const maxScrollSeconds = Math.max(0, safeTimelineDurationSeconds - durationSeconds);
  const startSeconds = Math.min(
    maxScrollSeconds,
    Math.max(0, workspace.scrollSeconds)
  );

  return {
    durationSeconds,
    endSeconds: Math.min(safeTimelineDurationSeconds, startSeconds + durationSeconds),
    maxScrollSeconds,
    startSeconds
  };
}

export function createTimelineHistory(workspace: EditingWorkspace): TimelineHistory {
  return {
    past: [],
    present: workspace,
    future: []
  };
}

export function applyTimelineEdit(
  history: TimelineHistory,
  operation: TimelineEditOperation
): TimelineHistory {
  const next = operation(history.present);

  return {
    past: [...history.past, history.present],
    present: next,
    future: []
  };
}

export function undoTimelineEdit(history: TimelineHistory): TimelineHistory {
  const previous = history.past.at(-1);

  if (!previous) {
    return history;
  }

  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future]
  };
}

export function redoTimelineEdit(history: TimelineHistory): TimelineHistory {
  const next = history.future[0];

  if (!next) {
    return history;
  }

  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1)
  };
}

function createSplitClipId(clipId: string, splitSeconds: number): string {
  return `${clipId}-split-${Math.round(splitSeconds * 1000)}`;
}

function findEditableClip(workspace: EditingWorkspace, clipId: string): EditClip {
  const clip = workspace.clips.find((candidate) => candidate.id === clipId);

  if (!clip) {
    throw new TimelineEditError("Clip was not found.");
  }

  const track = workspace.tracks.find((candidate) => candidate.id === clip.trackId);

  if (!track) {
    throw new TimelineEditError("Clip track was not found.");
  }

  if (track.locked) {
    throw new TimelineEditError("Locked tracks cannot be edited.");
  }

  return clip;
}

function getAffectedClipIds(
  workspace: EditingWorkspace,
  clip: EditClip,
  mode: "move" | "start" | "end",
  options: TimelineLinkedEditOptions
): string[] {
  const affectedClipIds = new Set([clip.id]);

  if (options.editLinkedClips === false) {
    return [...affectedClipIds];
  }

  for (const linkedClipId of clip.linkedClipIds) {
    const linkedClip = workspace.clips.find((candidate) => candidate.id === linkedClipId);

    if (!linkedClip) {
      throw new TimelineEditError("Clip was not found.");
    }

    if (isAlignedLinkedClip(clip, linkedClip, mode)) {
      findEditableClip(workspace, linkedClipId);
      affectedClipIds.add(linkedClip.id);
    }
  }

  return [...affectedClipIds];
}

function isAlignedLinkedClip(clip: EditClip, linkedClip: EditClip, mode: "move" | "start" | "end"): boolean {
  if (!linkedClip.linkedClipIds.includes(clip.id)) {
    return false;
  }

  if (mode === "move") {
    return almostEqual(clip.startSeconds, linkedClip.startSeconds) &&
      almostEqual(clip.durationSeconds, linkedClip.durationSeconds);
  }

  if (mode === "start") {
    return almostEqual(clip.startSeconds, linkedClip.startSeconds);
  }

  return almostEqual(getClipEndSeconds(clip), getClipEndSeconds(linkedClip));
}

function resolveSnappedTimelineSeconds(
  workspace: EditingWorkspace,
  seconds: number,
  options: TimelineSnapOptions = {}
): number {
  if (options.enabled === false) {
    return seconds;
  }

  const thresholdSeconds = options.thresholdSeconds ?? DEFAULT_TIMELINE_SNAP_THRESHOLD_SECONDS;
  const targets = getSnapTargets(workspace, options);
  const nearestTarget = targets
    .map((target) => ({
      target,
      distance: Math.abs(target - seconds)
    }))
    .filter((candidate) => candidate.distance <= thresholdSeconds)
    .sort((a, b) => a.distance - b.distance)[0];

  return nearestTarget?.target ?? seconds;
}

function getSnapTargets(workspace: EditingWorkspace, options: TimelineSnapOptions): number[] {
  const includePlayhead = options.includePlayhead ?? true;
  const includeClipEdges = options.includeClipEdges ?? true;
  const excludedClipIds = new Set(options.excludedClipIds ?? []);
  const targets = new Set<number>();

  if (includePlayhead) {
    targets.add(workspace.playheadSeconds);
  }

  if (includeClipEdges) {
    for (const clip of workspace.clips) {
      if (!excludedClipIds.has(clip.id)) {
        targets.add(clip.startSeconds);
        targets.add(getClipEndSeconds(clip));
      }
    }
  }

  return [...targets];
}

function mergeExcludedClipIds(
  existingClipIds: string[] | undefined,
  affectedClipIds: string[]
): string[] {
  return [...new Set([...(existingClipIds ?? []), ...affectedClipIds])];
}

function assertNoTrackOverlap(clips: EditClip[]): void {
  const clipsByTrack = new Map<string, EditClip[]>();

  for (const clip of clips) {
    const trackClips = clipsByTrack.get(clip.trackId) ?? [];
    trackClips.push(clip);
    clipsByTrack.set(clip.trackId, trackClips);
  }

  for (const trackClips of clipsByTrack.values()) {
    const sortedClips = [...trackClips].sort((a, b) => a.startSeconds - b.startSeconds);

    for (let index = 1; index < sortedClips.length; index += 1) {
      const previousClip = sortedClips[index - 1];
      const currentClip = sortedClips[index];

      if (getClipEndSeconds(previousClip) > currentClip.startSeconds + TIMELINE_EDGE_EPSILON_SECONDS) {
        throw new TimelineEditError("Timeline edit would overlap clips on the same track.");
      }
    }
  }
}

function getClipEndSeconds(clip: EditClip): number {
  return clip.startSeconds + clip.durationSeconds;
}

function assertClipSourceRange(
  clip: EditClip,
  inPointSeconds: number,
  durationSeconds: number,
  message: string
): void {
  if (
    clip.sourceDurationSeconds !== undefined &&
    (inPointSeconds < -TIMELINE_EDGE_EPSILON_SECONDS ||
      inPointSeconds + durationSeconds > clip.sourceDurationSeconds + TIMELINE_EDGE_EPSILON_SECONDS
    )
  ) {
    throw new TimelineEditError(message);
  }
}

function almostEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= TIMELINE_EDGE_EPSILON_SECONDS;
}

function sortClipsByTrackAndStart(clips: EditClip[], tracks: EditTrack[]): EditClip[] {
  const trackOrder = new Map(tracks.map((track, index) => [track.id, index]));

  return [...clips].sort((a, b) => {
    if (a.trackId === b.trackId) {
      return a.startSeconds - b.startSeconds;
    }

    return (trackOrder.get(a.trackId) ?? Number.MAX_SAFE_INTEGER) -
      (trackOrder.get(b.trackId) ?? Number.MAX_SAFE_INTEGER);
  });
}
