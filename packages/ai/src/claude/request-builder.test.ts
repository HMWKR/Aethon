import { describe, expect, it } from "vitest";
import { buildClaudeAdviserRequest } from "./request-builder";

describe("Claude adviser request builder", () => {
  it("marks the stable project prefix as cacheable", () => {
    const request = buildClaudeAdviserRequest({
      projectBible: { world: "AETHON launch film" },
      characters: [{ name: "Mira", role: "editor" }],
      styleGuide: { palette: "cool practical lights" },
      providerCatalogVersion: "2026-05",
      task: "scene-plan",
      sceneFocus: { sceneId: "scene-01", intent: "opening reveal" }
    });

    expect(request.messages[0]?.content[0]).toMatchObject({
      type: "text",
      cache_control: { type: "ephemeral" }
    });
    expect(request.cacheBoundary.stablePrefixHash).toMatch(/^[0-9a-f]{8}$/);
    expect(request.cacheBoundary.suffixHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("keeps the cache prefix stable when only the scene focus changes", () => {
    const base = {
      projectBible: { world: "AETHON launch film" },
      characters: [{ name: "Mira", role: "editor" }],
      styleGuide: { palette: "cool practical lights" },
      providerCatalogVersion: "2026-05",
      task: "scene-plan"
    };

    const first = buildClaudeAdviserRequest({
      ...base,
      sceneFocus: { sceneId: "scene-01", intent: "opening reveal" }
    });
    const second = buildClaudeAdviserRequest({
      ...base,
      sceneFocus: { sceneId: "scene-02", intent: "rights review" }
    });

    expect(first.cacheBoundary.stablePrefixHash).toBe(second.cacheBoundary.stablePrefixHash);
    expect(first.cacheBoundary.suffixHash).not.toBe(second.cacheBoundary.suffixHash);
  });

  it("changes the cache prefix when stable character context changes", () => {
    const first = buildClaudeAdviserRequest({
      projectBible: { world: "AETHON launch film" },
      characters: [{ name: "Mira", role: "editor" }],
      styleGuide: { palette: "cool practical lights" },
      providerCatalogVersion: "2026-05",
      task: "scene-plan",
      sceneFocus: { sceneId: "scene-01" }
    });
    const second = buildClaudeAdviserRequest({
      projectBible: { world: "AETHON launch film" },
      characters: [{ name: "Ari", role: "reviewer" }],
      styleGuide: { palette: "cool practical lights" },
      providerCatalogVersion: "2026-05",
      task: "scene-plan",
      sceneFocus: { sceneId: "scene-01" }
    });

    expect(first.cacheBoundary.stablePrefixHash).not.toBe(second.cacheBoundary.stablePrefixHash);
  });
});
