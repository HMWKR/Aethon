import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "app/actions/ai-control.ts"), "utf8");

describe("AI control server-action guardrails", () => {
  it("does not accept client-provided userId for generation queueing", () => {
    const queueInputSource = source.slice(
      source.indexOf("interface QueueGenerationRunInput"),
      source.indexOf("interface ApproveAndQueueGenerationRunInput")
    );

    expect(queueInputSource).not.toMatch(/userId:\s*string/);
    expect(source).not.toContain("userId: input.userId");
  });

  it("derives persisted identity from server auth", () => {
    expect(source).toContain("requireAethonUserId");
    expect(source).toContain("const userId = parsed.persist ? await requireAethonUserId()");
  });

  it("offers an approve-and-queue orchestration boundary", () => {
    expect(source).toContain("approveAndQueueGenerationRunAction");
    const approveActionSource = source.slice(
      source.indexOf("export async function approveAndQueueGenerationRunAction")
    );

    expect(approveActionSource).toContain("upsertProviderCapabilityForRun");
    expect(approveActionSource).toContain("recordDecisionAndCreateGenerationRun");
    expect(approveActionSource).not.toContain("repository.createGenerationRun");
  });

  it("validates server-action inputs at runtime", () => {
    expect(source).toContain("parseEvaluateAiSuggestionInput(input)");
    expect(source).toContain("parseRecordAiSuggestionDecisionInput(input)");
    expect(source).toContain("parseQueueGenerationRunInput(input)");
    expect(source).toContain("parseApproveAndQueueGenerationRunInput(input)");
    expect(source).toContain("requireRecord");
    expect(source).toContain("requireFiniteNonNegativeNumber");
  });

  it("re-reads persisted suggestions and preferences before approval queueing", () => {
    const approveActionSource = source.slice(
      source.indexOf("export async function approveAndQueueGenerationRunAction")
    );

    expect(approveActionSource).toContain("loadPersistedSuggestion");
    expect(approveActionSource).toContain("loadPersistedPreferences");
    expect(approveActionSource).toContain("upsertProviderCapabilityForRun");
    expect(approveActionSource).toContain("evaluateSuggestionGate(acceptedSuggestion, preferences)");
    expect(approveActionSource).not.toContain("gate: parsed.gate");
    expect(approveActionSource).not.toContain("preferences: parsed.preferences");
  });

  it("seeds the exact provider catalog row before persisted queue inserts", () => {
    expect(source).toContain("findProviderCapability(run.providerKey, run.modelKey)");
    expect(source).toContain("repository.upsertProviderCapability");
    expect(source).toContain("capability.pricingVersion !== run.pricingVersion");
  });
});
