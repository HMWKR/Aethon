import { describe, expect, it } from "vitest";
import {
  type EditingWorkspace,
  applyTimelineEdit,
  createTimelineHistory,
  getClipsForTrack,
  getTimelineVisibleRange,
  hydrateWorkspaceSourceDurations,
  moveClipToTime,
  rippleDeleteClip,
  rippleTrimClipEnd,
  rippleTrimClipStart,
  rollEditBoundary,
  redoTimelineEdit,
  setTimelineScroll,
  setTimelineZoom,
  snapClipStartToPreviousBoundary,
  slipClipInPoint,
  splitClipAtPlayhead,
  splitClipAtTime,
  trimClipEnd,
  trimClipStart,
  undoTimelineEdit
} from "./video-editing";

function createWorkspace(overrides: Partial<EditingWorkspace> = {}): EditingWorkspace {
  const workspace: EditingWorkspace = {
    activeTool: "select",
    playheadSeconds: 5,
    scrollSeconds: 0,
    zoom: 1,
    tracks: [
      {
        id: "video-1",
        type: "video",
        label: "Video 1",
        locked: false,
        muted: false,
        heightPx: 72
      },
      {
        id: "audio-1",
        type: "audio",
        label: "Audio 1",
        locked: false,
        muted: false,
        heightPx: 56
      }
    ],
    clips: [
      {
        id: "clip-a",
        trackId: "video-1",
        sceneId: "scene-a",
        sourceType: "uploaded-video",
        label: "A",
        startSeconds: 0,
        durationSeconds: 10,
        inPointSeconds: 2,
        sourceDurationSeconds: 16,
        status: "ready",
        color: "#62d6c7",
        linkedClipIds: []
      },
      {
        id: "clip-b",
        trackId: "video-1",
        sceneId: "scene-b",
        sourceType: "uploaded-video",
        label: "B",
        startSeconds: 12,
        durationSeconds: 4,
        inPointSeconds: 0,
        sourceDurationSeconds: 8,
        status: "ready",
        color: "#e8b454",
        linkedClipIds: ["audio-a"]
      },
      {
        id: "audio-a",
        trackId: "audio-1",
        sceneId: "scene-a",
        sourceType: "uploaded-audio",
        label: "A audio",
        startSeconds: 12,
        durationSeconds: 4,
        inPointSeconds: 0,
        sourceDurationSeconds: 8,
        status: "ready",
        color: "#72d38b",
        linkedClipIds: ["clip-b"]
      }
    ],
    effects: [],
    exportProfile: {
      id: "h264",
      label: "H.264",
      format: "mp4",
      width: 1920,
      height: 1080,
      fps: 24,
      videoBitrateMbps: 20,
      audioBitrateKbps: 320
    }
  };

  return {
    ...workspace,
    ...overrides
  };
}

describe("video editing timeline commands", () => {
  it("splits a clip at an internal time and preserves source in-points", () => {
    const workspace = splitClipAtTime(createWorkspace(), "clip-a", 4, "clip-a-right");
    const clips = getClipsForTrack(workspace, "video-1");

    expect(clips.map((clip) => clip.id)).toEqual(["clip-a", "clip-a-right", "clip-b"]);
    expect(clips[0]).toMatchObject({
      startSeconds: 0,
      durationSeconds: 4,
      inPointSeconds: 2
    });
    expect(clips[1]).toMatchObject({
      startSeconds: 4,
      durationSeconds: 6,
      inPointSeconds: 6
    });
    expect(workspace.playheadSeconds).toBe(4);
  });

  it("rejects split points outside clip bounds", () => {
    expect(() => splitClipAtTime(createWorkspace(), "clip-a", 0)).toThrow(
      "Split point must be inside the clip bounds."
    );
    expect(() => splitClipAtTime(createWorkspace(), "clip-a", 10)).toThrow(
      "Split point must be inside the clip bounds."
    );
  });

  it("hydrates clip source durations from media metadata", () => {
    const baseWorkspace = createWorkspace();
    const workspace = createWorkspace({
      clips: baseWorkspace.clips.map((clip) =>
        clip.id === "clip-b"
          ? {
              ...clip,
              sourceAssetId: "source-video-b",
              sourceDurationSeconds: undefined
            }
          : clip
      )
    });
    const hydrated = hydrateWorkspaceSourceDurations(workspace, [
      {
        id: "source-video-b",
        label: "B source",
        sourceType: "uploaded-video",
        durationSeconds: 9.5,
        metadataSource: "file-probe"
      }
    ]);

    expect(hydrated.clips.find((clip) => clip.id === "clip-b")).toMatchObject({
      sourceAssetId: "source-video-b",
      sourceDurationSeconds: 9.5,
      sourceType: "uploaded-video"
    });
  });

  it("splits the clip currently under the playhead", () => {
    const workspace = splitClipAtPlayhead(createWorkspace({ playheadSeconds: 5 }), "clip-a");

    expect(workspace.clips.some((clip) => clip.id === "clip-a-split-5000")).toBe(true);
    expect(workspace.playheadSeconds).toBe(5);
  });

  it("ripple deletes a clip and closes the gap on the same track only", () => {
    const workspace = rippleDeleteClip(createWorkspace(), "clip-a");

    expect(workspace.clips.some((clip) => clip.id === "clip-a")).toBe(false);
    expect(workspace.clips.find((clip) => clip.id === "clip-b")?.startSeconds).toBe(2);
    expect(workspace.clips.find((clip) => clip.id === "audio-a")?.startSeconds).toBe(12);
    expect(workspace.playheadSeconds).toBe(0);
  });

  it("blocks edits on locked tracks", () => {
    const workspace = createWorkspace({
      tracks: [
        {
          id: "video-1",
          type: "video",
          label: "Video 1",
          locked: true,
          muted: false,
          heightPx: 72
        }
      ]
    });

    expect(() => rippleDeleteClip(workspace, "clip-a")).toThrow("Locked tracks cannot be edited.");
  });

  it("supports undo and redo around timeline operations", () => {
    const initial = createTimelineHistory(createWorkspace());
    const afterSplit = applyTimelineEdit(initial, (workspace) =>
      splitClipAtTime(workspace, "clip-a", 5)
    );
    const afterDelete = applyTimelineEdit(afterSplit, (workspace) =>
      rippleDeleteClip(workspace, "clip-a-split-5000")
    );

    expect(afterDelete.present.clips.map((clip) => clip.id)).toEqual(["clip-a", "clip-b", "audio-a"]);

    const undoneDelete = undoTimelineEdit(afterDelete);
    expect(undoneDelete.present.clips.map((clip) => clip.id)).toEqual([
      "clip-a",
      "clip-a-split-5000",
      "clip-b",
      "audio-a"
    ]);

    const undoneSplit = undoTimelineEdit(undoneDelete);
    expect(undoneSplit.present.clips.map((clip) => clip.id)).toEqual(["clip-a", "clip-b", "audio-a"]);

    const redoneSplit = redoTimelineEdit(undoneSplit);
    expect(redoneSplit.present.clips.some((clip) => clip.id === "clip-a-split-5000")).toBe(true);
  });

  it("trims clip start and carries aligned linked audio", () => {
    const workspace = trimClipStart(createWorkspace(), "clip-b", 12.5);
    const video = workspace.clips.find((clip) => clip.id === "clip-b");
    const audio = workspace.clips.find((clip) => clip.id === "audio-a");

    expect(video).toMatchObject({
      startSeconds: 12.5,
      durationSeconds: 3.5,
      inPointSeconds: 0.5
    });
    expect(audio).toMatchObject({
      startSeconds: 12.5,
      durationSeconds: 3.5,
      inPointSeconds: 0.5
    });
  });

  it("trims clip end to the next clip boundary with snapping", () => {
    const workspace = trimClipEnd(createWorkspace(), "clip-a", 12.08, {
      snap: { thresholdSeconds: 0.1 }
    });

    expect(workspace.clips.find((clip) => clip.id === "clip-a")).toMatchObject({
      startSeconds: 0,
      durationSeconds: 12
    });
    expect(workspace.playheadSeconds).toBe(12);
  });

  it("ripple trims clip ends and shifts downstream clips", () => {
    const workspace = rippleTrimClipEnd(createWorkspace(), "clip-a", 9, {
      snap: { enabled: false }
    });

    expect(workspace.clips.find((clip) => clip.id === "clip-a")).toMatchObject({
      durationSeconds: 9
    });
    expect(workspace.clips.find((clip) => clip.id === "clip-b")).toMatchObject({
      startSeconds: 11,
      durationSeconds: 4,
      inPointSeconds: 0
    });
    expect(workspace.clips.find((clip) => clip.id === "audio-a")).toMatchObject({
      startSeconds: 11,
      durationSeconds: 4,
      inPointSeconds: 0
    });
    expect(workspace.playheadSeconds).toBe(9);
  });

  it("rejects ripple trim edits past source duration", () => {
    expect(() =>
      rippleTrimClipEnd(createWorkspace(), "clip-a", 14.5, {
        snap: { enabled: false }
      })
    ).toThrow("Ripple trim would exceed the available source duration.");
  });

  it("ripple trims clip starts and closes the downstream timeline", () => {
    const workspace = rippleTrimClipStart(createWorkspace(), "clip-a", 1, {
      snap: { enabled: false }
    });

    expect(workspace.clips.find((clip) => clip.id === "clip-a")).toMatchObject({
      startSeconds: 0,
      durationSeconds: 9,
      inPointSeconds: 3
    });
    expect(workspace.clips.find((clip) => clip.id === "clip-b")).toMatchObject({
      startSeconds: 11,
      durationSeconds: 4,
      inPointSeconds: 0
    });
    expect(workspace.clips.find((clip) => clip.id === "audio-a")).toMatchObject({
      startSeconds: 11,
      durationSeconds: 4,
      inPointSeconds: 0
    });
    expect(workspace.playheadSeconds).toBe(0);
  });

  it("rejects ripple trim starts that move backward", () => {
    expect(() =>
      rippleTrimClipStart(createWorkspace(), "clip-b", 11.5, {
        snap: { enabled: false }
      })
    ).toThrow("Ripple trim start must move forward.");
  });

  it("moves a clip and its aligned linked audio without changing source in-points", () => {
    const workspace = moveClipToTime(createWorkspace(), "clip-b", 16);

    expect(workspace.clips.find((clip) => clip.id === "clip-b")).toMatchObject({
      startSeconds: 16,
      inPointSeconds: 0
    });
    expect(workspace.clips.find((clip) => clip.id === "audio-a")).toMatchObject({
      startSeconds: 16,
      inPointSeconds: 0
    });
  });

  it("ignores non-aligned linked clips when checking locked tracks", () => {
    const baseWorkspace = createWorkspace();
    const workspace = {
      ...baseWorkspace,
      tracks: baseWorkspace.tracks.map((track) =>
        track.id === "audio-1"
          ? {
              ...track,
              locked: true
            }
          : track
      ),
      clips: baseWorkspace.clips.map((clip) =>
        clip.id === "clip-a"
          ? {
              ...clip,
              linkedClipIds: ["audio-a"]
            }
          : clip
      )
    };
    const moved = moveClipToTime(workspace, "clip-a", 1);

    expect(moved.clips.find((clip) => clip.id === "clip-a")?.startSeconds).toBe(1);
    expect(moved.clips.find((clip) => clip.id === "audio-a")?.startSeconds).toBe(12);
  });

  it("snaps a moved clip back to the previous timeline boundary", () => {
    const moved = moveClipToTime(createWorkspace(), "clip-b", 16);
    const snapped = snapClipStartToPreviousBoundary(moved, "clip-b");

    expect(snapped.clips.find((clip) => clip.id === "clip-b")?.startSeconds).toBe(10);
    expect(snapped.clips.find((clip) => clip.id === "audio-a")?.startSeconds).toBe(10);
  });

  it("rejects moves that overlap another clip on the same track", () => {
    expect(() => moveClipToTime(createWorkspace(), "clip-b", 9)).toThrow(
      "Timeline edit would overlap clips on the same track."
    );
  });

  it("rolls an adjacent boundary and carries the right-side linked audio", () => {
    const baseWorkspace = createWorkspace();
    const workspace = {
      ...baseWorkspace,
      clips: baseWorkspace.clips.map((clip) =>
        clip.id === "clip-a"
          ? {
              ...clip,
              durationSeconds: 12
            }
          : clip
      )
    };
    const rolled = rollEditBoundary(workspace, "clip-a", "clip-b", 12.5);

    expect(rolled.clips.find((clip) => clip.id === "clip-a")).toMatchObject({
      startSeconds: 0,
      durationSeconds: 12.5,
      inPointSeconds: 2
    });
    expect(rolled.clips.find((clip) => clip.id === "clip-b")).toMatchObject({
      startSeconds: 12.5,
      durationSeconds: 3.5,
      inPointSeconds: 0.5
    });
    expect(rolled.clips.find((clip) => clip.id === "audio-a")).toMatchObject({
      startSeconds: 12.5,
      durationSeconds: 3.5,
      inPointSeconds: 0.5
    });
  });

  it("rejects rolling edits when clips do not share a boundary", () => {
    expect(() => rollEditBoundary(createWorkspace(), "clip-a", "clip-b", 12.5)).toThrow(
      "Rolling edit requires adjacent clips on the same track."
    );
  });

  it("rejects rolling edits before the right clip source starts", () => {
    const baseWorkspace = createWorkspace();
    const workspace = {
      ...baseWorkspace,
      clips: baseWorkspace.clips.map((clip) =>
        clip.id === "clip-a"
          ? {
              ...clip,
              durationSeconds: 12
            }
          : clip
      )
    };

    expect(() => rollEditBoundary(workspace, "clip-a", "clip-b", 11.5)).toThrow(
      "Rolling edit would exceed the available source duration."
    );
  });

  it("slips a clip and aligned linked audio without moving timeline geometry", () => {
    const slipped = slipClipInPoint(createWorkspace(), "clip-b", 0.5);

    expect(slipped.clips.find((clip) => clip.id === "clip-b")).toMatchObject({
      startSeconds: 12,
      durationSeconds: 4,
      inPointSeconds: 0.5
    });
    expect(slipped.clips.find((clip) => clip.id === "audio-a")).toMatchObject({
      startSeconds: 12,
      durationSeconds: 4,
      inPointSeconds: 0.5
    });
  });

  it("rejects slip edits past the available source duration", () => {
    expect(() => slipClipInPoint(createWorkspace(), "clip-b", 4.5)).toThrow(
      "Slip edit exceeds the available source duration."
    );
  });

  it("rejects trim-out edits past the available source duration", () => {
    const workspace = createWorkspace({
      clips: createWorkspace().clips.map((clip) =>
        clip.id === "clip-a"
          ? {
              ...clip,
              sourceDurationSeconds: 14
            }
          : clip
      )
    });

    expect(() => trimClipEnd(workspace, "clip-a", 12.5, { snap: { enabled: false } })).toThrow(
      "Trim would exceed the available source duration."
    );
  });

  it("clamps timeline zoom to the supported workspace range", () => {
    expect(setTimelineZoom(createWorkspace(), 0.1).zoom).toBe(0.5);
    expect(setTimelineZoom(createWorkspace(), 2.25).zoom).toBe(2.25);
    expect(setTimelineZoom(createWorkspace(), 8).zoom).toBe(4);
  });

  it("clamps timeline scroll to the visible zoom range", () => {
    const workspace = setTimelineZoom(createWorkspace(), 2);
    const scrolled = setTimelineScroll(workspace, 20);
    const range = getTimelineVisibleRange(scrolled);

    expect(range).toMatchObject({
      durationSeconds: 8,
      endSeconds: 16,
      maxScrollSeconds: 8,
      startSeconds: 8
    });
    expect(setTimelineScroll(workspace, -2).scrollSeconds).toBe(0);
    expect(setTimelineZoom(scrolled, 1).scrollSeconds).toBe(0);
  });
});
