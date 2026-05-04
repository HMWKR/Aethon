import { describe, expect, it } from "vitest";
import {
  DEFAULT_AI_PREFERENCES,
  decideSuggestion,
  queueGenerationRunFromSuggestion,
  simulateProviderRun,
  type AiSuggestion
} from "./index";

const externalSuggestion: AiSuggestion = {
  id: "suggestion-provider-sim",
  sceneId: "scene-01",
  taskId: "model-selection",
  title: "Kling detail pass",
  summary: "Create a provider-simulated generation path.",
  recommendedOptionId: "kling",
  decision: "pending",
  options: [
    {
      id: "kling",
      label: "Kling detail pass",
      provider: "Kling",
      model: "Kling image-to-video",
      estimatedCostUsd: 0.74,
      qualityScore: 88,
      reason: "Body motion is the highest priority for this scene.",
      tradeoffs: ["External provider execution remains approval-gated."]
    }
  ],
  riskFlags: []
};

describe("provider simulation execution", () => {
  it("creates run events and export evidence for a successful simulated provider run", () => {
    const run = createApprovedRun("run-provider-sim-success");
    const result = simulateProviderRun({
      run,
      workerId: "worker-01",
      claimToken: "claim-provider-sim-success",
      now: new Date("2026-05-04T00:00:00.000Z")
    });

    expect(result.status).toBe("succeeded");
    expect(result.run.status).toBe("succeeded");
    expect(result.events.map((event) => event.type)).toEqual([
      "claimed",
      "running",
      "succeeded"
    ]);
    expect(result.validationReport?.runId).toBe(run.id);
    expect(result.validationReport?.artifactAssetIds).toEqual([`asset-${run.id}`]);
    expect(result.costLedgerEntry?.runId).toBe(run.id);
    expect(result.costLedgerEntry?.status).toBe("spent");
    expect(result.rightsManifestEntry?.assetId).toBe(`asset-${run.id}`);
    expect(result.rightsManifestEntry?.status).toBe("cleared");
    expect(result.exportManifest?.assetIds).toEqual([`asset-${run.id}`]);
    expect(result.exportManifest?.modelRunIds).toEqual([run.id]);
    expect(result.exportManifest?.validationReportIds).toEqual([`validation-${run.id}`]);
    expect(result.exportManifest?.costLedgerEntryIds).toEqual([`cost-${run.id}`]);
    expect(result.exportManifest?.rightsManifestEntryIds).toEqual([`rights-${run.id}`]);
    expect(result.exportManifest?.generatedContentLabel).toBe("ai-generated");
    expect(result.exportManifest?.renderArtifact?.checksumAlgorithm).toBe("sha256");
    expect(result.exportManifest?.renderArtifact?.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(result.exportManifest?.renderArtifact?.sourceManifestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.exportManifest?.renderArtifact?.uri).toBe(
      `aethon-render://project-01/export-${run.id}.mp4`
    );
    expect(result.exportManifest?.renderArtifact?.renderer).toBe("aethon-local-renderer");
    expect(result.exportManifest?.c2paAttachment?.verificationStatus).toBe("verified");
    expect(result.exportManifest?.c2paAttachment?.signatureAlgorithm).toBe(
      "aethon-local-sha256-attestation-v1"
    );
    expect(result.exportManifest?.c2paAttachment?.manifestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.exportManifest?.c2paStatus).toBe("attached");
    expect(result.exportManifest?.rightsSummary).toMatchObject({
      generatedAssetCount: 1,
      clearedRightsCount: 1
    });
    expect(result.exportManifest?.previewRenderStatus).toBe("ready");
    expect(result.exportReadiness?.status).toBe("ready");
  });

  it("creates deterministic render and C2PA-ready local attestation proof", () => {
    const run = createApprovedRun("run-provider-sim-deterministic");
    const first = simulateProviderRun({
      run,
      workerId: "worker-01",
      claimToken: "claim-provider-sim-deterministic",
      now: new Date("2026-05-04T00:00:00.000Z")
    });
    const second = simulateProviderRun({
      run,
      workerId: "worker-01",
      claimToken: "claim-provider-sim-deterministic",
      now: new Date("2026-05-04T00:00:00.000Z")
    });

    expect(first.exportManifest?.renderArtifact?.checksum).toBe(
      second.exportManifest?.renderArtifact?.checksum
    );
    expect(first.exportManifest?.renderArtifact?.sourceManifestHash).toBe(
      second.exportManifest?.renderArtifact?.sourceManifestHash
    );
    expect(first.exportManifest?.c2paAttachment?.manifestHash).toBe(
      second.exportManifest?.c2paAttachment?.manifestHash
    );

    const changedFrameRate = simulateProviderRun({
      run,
      workerId: "worker-01",
      claimToken: "claim-provider-sim-deterministic",
      now: new Date("2026-05-04T00:00:00.000Z"),
      outputFrameRate: 30
    });

    expect(changedFrameRate.exportManifest?.renderArtifact?.sourceManifestHash).not.toBe(
      first.exportManifest?.renderArtifact?.sourceManifestHash
    );
  });

  it("keeps failed simulated provider runs out of export evidence", () => {
    const run = createApprovedRun("run-provider-sim-failure");
    const result = simulateProviderRun({
      run,
      workerId: "worker-01",
      claimToken: "claim-provider-sim-failure",
      now: new Date("2026-05-04T00:00:00.000Z"),
      failWithReason: "provider timeout"
    });

    expect(result.status).toBe("failed");
    expect(result.run.status).toBe("failed");
    expect(result.events.map((event) => event.type)).toEqual([
      "claimed",
      "running",
      "failed"
    ]);
    expect(result.exportManifest).toBeNull();
    expect(result.exportReadiness).toBeNull();
  });

  it("surfaces validation review blockers from simulated output", () => {
    const run = createApprovedRun("run-provider-sim-review");
    const result = simulateProviderRun({
      run,
      workerId: "worker-01",
      claimToken: "claim-provider-sim-review",
      now: new Date("2026-05-04T00:00:00.000Z"),
      validationChecks: [
        {
          id: "identity-drift",
          label: "Identity drift",
          status: "warn",
          severity: "warning",
          detail: "Face similarity is below the target threshold."
        }
      ]
    });

    expect(result.status).toBe("succeeded");
    expect(result.exportReadiness?.status).toBe("blocked");
    expect(result.exportReadiness?.blockers.join(" ")).toContain("needs review");
  });
});

function createApprovedRun(id: string) {
  const [acceptedSuggestion] = decideSuggestion(
    [externalSuggestion],
    externalSuggestion.id,
    "accepted",
    "approved for provider simulation"
  );
  const decision = queueGenerationRunFromSuggestion({
    id,
    projectId: "project-01",
    userId: "user-01",
    suggestion: acceptedSuggestion!,
    preferences: DEFAULT_AI_PREFERENCES,
    now: new Date("2026-05-04T00:00:00.000Z")
  });

  if (!decision.run) {
    throw new Error("Expected approved provider simulation run to queue.");
  }

  return decision.run;
}
