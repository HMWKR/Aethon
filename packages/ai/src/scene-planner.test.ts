import { describe, expect, it } from "vitest";
import { planScenes } from "./scene-planner";

const brief = [
  "A director prepares a tense launch sequence in a neon editing bay.",
  "The hero notices a continuity break in the generated footage.",
  "A quiet review moment exposes the missing rights evidence.",
  "The final reveal shows the approved scene replacing the rough draft."
].join(" ");

describe("deterministic scene planner", () => {
  it("creates pending adviser scene suggestions with complete prompt pairs", () => {
    const result = planScenes({
      projectId: "project-01",
      requestedBy: "editor-01",
      brief,
      targetSceneCount: 25,
      targetDurationSeconds: 150,
      characters: ["Mira, lead editor", "Ari, continuity reviewer"],
      background: "neon editing bay",
      style: "cinematic editorial realism",
      nowIso: "2026-05-04T00:00:00.000Z"
    });

    expect(result.scenes).toHaveLength(25);
    expect(result.missingInformation).toEqual([]);

    for (const scene of result.scenes) {
      expect(scene.approvalStatus).toBe("pending");
      expect(scene.sceneSpec.approvalPolicy.externalProviderAllowed).toBe(false);
      expect(scene.sceneSpec.approvalPolicy.maxApprovedCostUsd).toBe(0);
      expect(scene.promptIssues).toEqual([]);
      expect(Object.values(scene.promptPair.checklist).every(Boolean)).toBe(true);
      expect(scene.sceneSpec.videoPrompt).toContain("Motion:");
    }
  });

  it("is stable for the same input", () => {
    const input = {
      projectId: "project-01",
      requestedBy: "editor-01",
      brief,
      targetSceneCount: 6,
      characters: ["Mira"],
      background: "review suite",
      style: "grounded sci-fi",
      nowIso: "2026-05-04T00:00:00.000Z"
    };

    expect(planScenes(input)).toEqual(planScenes(input));
  });

  it("records missing project context without queueing external work", () => {
    const result = planScenes({
      projectId: "project-02",
      requestedBy: "editor-01",
      brief: "Sketch a rough launch sequence.",
      targetSceneCount: 2
    });

    expect(result.missingInformation).toEqual([
      "character bible",
      "background card",
      "style guide"
    ]);
    expect(result.scenes[0]?.sceneSpec.approvalPolicy.externalProviderAllowed).toBe(false);
  });
});
