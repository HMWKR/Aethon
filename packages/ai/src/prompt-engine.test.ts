import { describe, expect, it } from "vitest";
import { composePromptPair, lintPromptPair } from "./prompt-engine";

describe("prompt engine", () => {
  it("builds image and video prompts from the seven required elements", () => {
    const pair = composePromptPair({
      intent: "The editor compares two generated takes before approving the hero shot.",
      characters: ["Mira", "Ari"],
      background: "timeline review room",
      style: "clean production UI realism",
      continuity: ["same costume", "same lens language"],
      camera: "tracking",
      mood: "tense",
      durationSeconds: 6,
      shotType: "action"
    });

    expect(Object.values(pair.checklist).every(Boolean)).toBe(true);
    expect(pair.imagePrompt).toContain("Characters: Mira; Ari");
    expect(pair.videoPrompt).toContain("Motion:");
    expect(pair.videoPrompt).toContain("Duration: 6s");
    expect(lintPromptPair(pair)).toEqual([]);
  });

  it("flags video prompts that omit motion language", () => {
    const pair = composePromptPair({
      intent: "A static portrait of the editor.",
      characters: ["Mira"],
      background: "studio",
      style: "editorial",
      continuity: ["same jacket"],
      camera: "close-up",
      mood: "quiet",
      durationSeconds: 4,
      shotType: "reaction"
    });

    const issues = lintPromptPair({
      ...pair,
      videoPrompt: "Portrait of Mira in the studio."
    });

    expect(issues.map((issue) => issue.id)).toContain("video-motion-missing");
  });
});
