import { describe, expect, it } from "vitest";
import {
  DEFAULT_AI_PREFERENCES,
  INITIAL_WORKSPACE,
  PROVIDER_CAPABILITIES,
  evaluateExportReadiness,
  findProviderCapability,
  findProviderCapabilityByModel,
  countRightsIssues,
  blocksExport,
  claimGenerationRun,
  createLocalC2paAttachment,
  createGenerationRunEvent,
  createRenderArtifactProof,
  decideSuggestion,
  evaluateSuggestionGate,
  formatTimecode,
  getClipAtPlayhead,
  getClipsForTrack,
  getExportManifestEvidenceIssues,
  getMissingValidationSceneIds,
  getValidationStatus,
  getTimelineDurationSeconds,
  queueGenerationRunFromSuggestion,
  summarizeExportManifestEvidence,
  transitionGenerationRun,
  updateGlobalMode,
  updateTaskMode,
  validateProviderRequest,
  validateProviderCatalogSelection,
  validateProviderCapabilityForQueue,
  validateSceneSpecForRouting,
  type AiSuggestion
} from "./index";

const localSuggestion: AiSuggestion = {
  id: "suggestion-local-qc",
  sceneId: "scene-01",
  taskId: "export-qc",
  title: "Local QC",
  summary: "로컬 품질 검사를 실행합니다.",
  recommendedOptionId: "local-qc",
  decision: "pending",
  options: [
    {
      id: "local-qc",
      label: "Local QC",
      provider: "local",
      model: "AETHON export checker",
      estimatedCostUsd: 0,
      qualityScore: 95,
      reason: "외부 호출 없이 검사합니다.",
      tradeoffs: []
    }
  ],
  riskFlags: [
    {
      id: "low-quality-risk",
      category: "quality",
      severity: "low",
      label: "낮은 품질 리스크",
      detail: "수동 확인으로 충분합니다."
    }
  ]
};

const externalSuggestion: AiSuggestion = {
  ...localSuggestion,
  id: "suggestion-external-video",
  taskId: "model-selection",
  recommendedOptionId: "kling",
  options: [
    {
      id: "kling",
      label: "Kling detail pass",
      provider: "Kling",
      model: "Kling image-to-video",
      estimatedCostUsd: 0.74,
      qualityScore: 88,
      reason: "손 동작에 강합니다.",
      tradeoffs: ["외부 provider 호출이 필요합니다."]
    }
  ],
  riskFlags: [
    {
      id: "hand-risk",
      category: "quality",
      severity: "high",
      label: "손 형태 붕괴",
      detail: "형태가 깨질 수 있습니다.",
      blocksAuto: true
    }
  ]
};

describe("AI Control approval gate", () => {
  it("requires user choice in Adviser Mode", () => {
    const gate = evaluateSuggestionGate(externalSuggestion, DEFAULT_AI_PREFERENCES);

    expect(gate.status).toBe("requires-approval");
    expect(gate.requiresUserChoice).toBe(true);
    expect(gate.reasons.join(" ")).toContain("Adviser Mode");
  });

  it("blocks suggestions when global mode is off", () => {
    const preferences = updateGlobalMode(DEFAULT_AI_PREFERENCES, "off");
    const gate = evaluateSuggestionGate(externalSuggestion, preferences);

    expect(gate.status).toBe("blocked");
    expect(gate.canExecute).toBe(false);
  });

  it("allows local zero-cost low-risk work inside explicit Auto policy", () => {
    const preferences = updateTaskMode(
      updateGlobalMode(DEFAULT_AI_PREFERENCES, "auto"),
      "export-qc",
      "auto"
    );
    const gate = evaluateSuggestionGate(localSuggestion, preferences);

    expect(gate.status).toBe("ready");
    expect(gate.requiresUserChoice).toBe(false);
  });

  it("keeps external cost and high risk behind approval even when Auto is selected", () => {
    const preferences = updateTaskMode(
      updateGlobalMode(DEFAULT_AI_PREFERENCES, "auto"),
      "model-selection",
      "auto"
    );
    const gate = evaluateSuggestionGate(externalSuggestion, preferences);

    expect(gate.status).toBe("requires-approval");
    expect(gate.reasons.join(" ")).toContain("외부 provider");
    expect(gate.reasons.join(" ")).toContain("HIGH 리스크");
  });

  it("records user decisions without mutating other suggestions", () => {
    const next = decideSuggestion(
      [localSuggestion, externalSuggestion],
      externalSuggestion.id,
      "accepted",
      "근거 확인 후 승인"
    );

    expect(next[0]?.decision).toBe("pending");
    expect(next[1]?.decision).toBe("accepted");
    expect(next[1]?.decisionReason).toBe("근거 확인 후 승인");
  });

  it("counts only rights and privacy risks as rights issues", () => {
    const suggestions: AiSuggestion[] = [
      {
        ...localSuggestion,
        riskFlags: [
          ...localSuggestion.riskFlags,
          {
            id: "consent-missing",
            category: "rights",
            severity: "medium",
            label: "동의 누락",
            detail: "레퍼런스 권리 확인이 필요합니다."
          },
          {
            id: "face-privacy",
            category: "privacy",
            severity: "medium",
            label: "실존 인물 가능성",
            detail: "개인정보/퍼블리시티권 검토가 필요합니다."
          }
        ]
      }
    ];

    expect(countRightsIssues(suggestions)).toBe(2);
  });

  it("does not queue external generation before an adviser approval", () => {
    const decision = queueGenerationRunFromSuggestion({
      id: "run-01",
      projectId: "project-01",
      userId: "user-01",
      suggestion: externalSuggestion,
      preferences: DEFAULT_AI_PREFERENCES,
      now: new Date("2026-05-03T00:00:00.000Z")
    });

    expect(decision.status).toBe("requires-approval");
    expect(decision.run).toBeNull();
  });

  it("queues a generation run after the user accepts the suggestion", () => {
    const [acceptedSuggestion] = decideSuggestion(
      [externalSuggestion],
      externalSuggestion.id,
      "accepted",
      "approved after reviewing cost and risk"
    );

    const decision = queueGenerationRunFromSuggestion({
      id: "run-02",
      projectId: "project-01",
      userId: "user-01",
      suggestion: acceptedSuggestion!,
      preferences: DEFAULT_AI_PREFERENCES,
      now: new Date("2026-05-03T00:00:00.000Z")
    });

    expect(decision.status).toBe("queued");
    expect(decision.run?.triggerSource).toBe("approved-suggestion");
    expect(decision.run?.status).toBe("queued");
    expect(decision.run?.providerCapabilityId).toBe("kling-video");
    expect(decision.run?.providerKey).toBe("kling");
    expect(decision.run?.modelKey).toBe("kling-image-to-video");
    expect(decision.run?.pricingVersion).toBe("2026-05-estimate");
  });

  it("enforces generation run lifecycle transitions", () => {
    const [acceptedSuggestion] = decideSuggestion(
      [externalSuggestion],
      externalSuggestion.id,
      "accepted",
      "approved after reviewing cost and risk"
    );

    const queued = queueGenerationRunFromSuggestion({
      id: "run-03",
      projectId: "project-01",
      userId: "user-01",
      suggestion: acceptedSuggestion!,
      preferences: DEFAULT_AI_PREFERENCES,
      now: new Date("2026-05-03T00:00:00.000Z")
    }).run!;

    const claim = claimGenerationRun({
      id: "event-claim-03",
      run: queued,
      now: new Date("2026-05-03T00:01:00.000Z"),
      actorId: "worker",
      claimToken: "claim-token-03",
      leaseSeconds: 180,
      reason: "provider job started"
    });

    expect(claim.status).toBe("claimed");
    expect(claim.event?.type).toBe("claimed");
    expect(claim.run?.leaseOwner).toBe("worker");

    const succeeded = transitionGenerationRun({
      run: claim.run!,
      to: "succeeded",
      now: new Date("2026-05-03T00:03:00.000Z"),
      actorId: "worker",
      outputAssetId: "asset-01",
      reason: "provider returned output asset"
    });

    expect(succeeded.status).toBe("succeeded");
    expect(succeeded.outputAssetId).toBe("asset-01");
    expect(succeeded.auditTrail).toHaveLength(3);
    expect(succeeded.leaseOwner).toBeNull();
    expect(() =>
      transitionGenerationRun({
        run: succeeded,
        to: "running",
        now: new Date("2026-05-03T00:04:00.000Z"),
        actorId: "worker",
        reason: "terminal states cannot restart"
      })
    ).toThrow("Invalid generation run transition");
  });

  it("rejects duplicate worker claims while a lease is active", () => {
    const [acceptedSuggestion] = decideSuggestion(
      [externalSuggestion],
      externalSuggestion.id,
      "accepted",
      "approved after reviewing cost and risk"
    );
    const queued = queueGenerationRunFromSuggestion({
      id: "run-claim-duplicate",
      projectId: "project-01",
      userId: "user-01",
      suggestion: acceptedSuggestion!,
      preferences: DEFAULT_AI_PREFERENCES,
      now: new Date("2026-05-03T00:00:00.000Z")
    }).run!;
    const firstClaim = claimGenerationRun({
      id: "event-claim-first",
      run: queued,
      now: new Date("2026-05-03T00:01:00.000Z"),
      actorId: "worker-a",
      claimToken: "claim-token-a",
      leaseSeconds: 120,
      reason: "worker-a claimed the run"
    });
    const secondClaim = claimGenerationRun({
      id: "event-claim-second",
      run: firstClaim.run!,
      now: new Date("2026-05-03T00:01:30.000Z"),
      actorId: "worker-b",
      claimToken: "claim-token-b",
      leaseSeconds: 120,
      reason: "worker-b attempted duplicate claim"
    });

    expect(secondClaim.status).toBe("blocked");
    expect(secondClaim.run).toBeNull();
    expect(secondClaim.reasons.join(" ")).toContain("active lease");
  });

  it("treats repeated claims with the same token as idempotent", () => {
    const [acceptedSuggestion] = decideSuggestion(
      [externalSuggestion],
      externalSuggestion.id,
      "accepted",
      "approved after reviewing cost and risk"
    );
    const queued = queueGenerationRunFromSuggestion({
      id: "run-claim-idempotent",
      projectId: "project-01",
      userId: "user-01",
      suggestion: acceptedSuggestion!,
      preferences: DEFAULT_AI_PREFERENCES,
      now: new Date("2026-05-03T00:00:00.000Z")
    }).run!;
    const firstClaim = claimGenerationRun({
      id: "event-claim-idempotent",
      run: queued,
      now: new Date("2026-05-03T00:01:00.000Z"),
      actorId: "worker-a",
      claimToken: "claim-token-a",
      leaseSeconds: 120,
      reason: "worker-a claimed the run"
    });
    const replayedClaim = claimGenerationRun({
      id: "event-claim-idempotent-replay",
      run: firstClaim.run!,
      now: new Date("2026-05-03T00:01:10.000Z"),
      actorId: "worker-a",
      claimToken: "claim-token-a",
      leaseSeconds: 120,
      reason: "worker-a replayed the same claim"
    });

    expect(replayedClaim.status).toBe("claimed");
    expect(replayedClaim.event).toBeNull();
    expect(replayedClaim.run?.claimToken).toBe("claim-token-a");
  });

  it("allows a stale leased run to be reclaimed after lease expiry", () => {
    const [acceptedSuggestion] = decideSuggestion(
      [externalSuggestion],
      externalSuggestion.id,
      "accepted",
      "approved after reviewing cost and risk"
    );
    const queued = queueGenerationRunFromSuggestion({
      id: "run-claim-expired",
      projectId: "project-01",
      userId: "user-01",
      suggestion: acceptedSuggestion!,
      preferences: DEFAULT_AI_PREFERENCES,
      now: new Date("2026-05-03T00:00:00.000Z")
    }).run!;
    const firstClaim = claimGenerationRun({
      id: "event-expired-first",
      run: queued,
      now: new Date("2026-05-03T00:01:00.000Z"),
      actorId: "worker-a",
      claimToken: "claim-token-a",
      leaseSeconds: 30,
      reason: "worker-a claimed the run"
    });
    const secondClaim = claimGenerationRun({
      id: "event-expired-second",
      run: firstClaim.run!,
      now: new Date("2026-05-03T00:02:00.000Z"),
      actorId: "worker-b",
      claimToken: "claim-token-b",
      leaseSeconds: 120,
      reason: "worker-b reclaimed expired lease"
    });

    expect(secondClaim.status).toBe("claimed");
    expect(secondClaim.run?.leaseOwner).toBe("worker-b");
    expect(secondClaim.event?.claimToken).toBe("claim-token-b");
  });

  it("creates append-only lifecycle event snapshots from a generation run", () => {
    const [acceptedSuggestion] = decideSuggestion(
      [externalSuggestion],
      externalSuggestion.id,
      "accepted",
      "approved after reviewing cost and risk"
    );
    const queued = queueGenerationRunFromSuggestion({
      id: "run-event-snapshot",
      projectId: "project-01",
      userId: "user-01",
      suggestion: acceptedSuggestion!,
      preferences: DEFAULT_AI_PREFERENCES,
      now: new Date("2026-05-03T00:00:00.000Z")
    }).run!;
    const event = createGenerationRunEvent({
      id: "event-queued",
      run: queued,
      type: "queued",
      at: new Date("2026-05-03T00:00:00.000Z"),
      actorId: "user-01",
      reason: "created from approved suggestion"
    });

    expect(event.runId).toBe("run-event-snapshot");
    expect(event.type).toBe("queued");
    expect(event.status).toBe("queued");
    expect(event.retryCount).toBe(0);
    expect(event.leaseOwner).toBeNull();
  });
});

describe("Editing workspace helpers", () => {
  it("calculates timeline duration from the furthest clip edge", () => {
    expect(getTimelineDurationSeconds(INITIAL_WORKSPACE)).toBe(14.6);
  });

  it("keeps track clips sorted by timeline start", () => {
    const videoClips = getClipsForTrack(INITIAL_WORKSPACE, "v1");

    expect(videoClips.map((clip) => clip.id)).toEqual([
      "clip-video-01",
      "clip-video-02",
      "clip-video-03"
    ]);
  });

  it("finds the active clip under the playhead", () => {
    expect(getClipAtPlayhead(INITIAL_WORKSPACE)?.id).toBe("clip-ai-01");
  });

  it("formats professional timecode", () => {
    expect(formatTimecode(6.25, 24)).toBe("00:00:06:06");
  });
});

describe("Production readiness contracts", () => {
  it("blocks model routing when the editor intent and prompt pair are incomplete", () => {
    const issues = validateSceneSpecForRouting({
      id: "spec-empty",
      sceneId: "scene-empty",
      userIntent: "arm",
      requestedBy: "test-editor",
      decisionId: null,
      approvalPolicy: {
        requiresEditorApproval: true,
        maxApprovedCostUsd: 0,
        externalProviderAllowed: true
      },
      cameraAngle: "medium",
      emotion: "urgent",
      shotType: "action",
      budgetPriority: "balanced",
      isHighlight: false,
      targetAspectRatio: "16:9",
      providerInputMode: "image-to-video",
      imagePrompt: "",
      videoPrompt: "Move the arm forward.",
      imageModel: "FLUX",
      videoModel: "Kling image-to-video",
      selectionMode: "ai-advised",
      sourceAssetIds: [],
      referenceAssetIds: [],
      constraints: {
        rights: [],
        safety: [],
        continuity: []
      },
      continuityLocks: {
        character: 0,
        background: 0,
        style: 0
      },
      createdAtIso: "2026-05-03T00:00:00.000Z",
      updatedAtIso: "2026-05-03T00:00:00.000Z"
    });

    expect(issues.filter((issue) => issue.severity === "blocking")).toHaveLength(3);
  });

  it("validates provider capability before a request can be routed", () => {
    const capability = findProviderCapability("Kling", "Kling image-to-video");

    expect(capability?.inputModes).toContain("first-last-frame");

    const issues = validateProviderRequest({
      provider: "Kling",
      model: "Kling image-to-video",
      inputMode: "text-to-video",
      durationSeconds: 14,
      aspectRatio: "21:9",
      nowIso: "2026-05-03T00:00:00.000Z"
    });

    expect(issues.map((issue) => issue.id)).toEqual([
      "kling-video-input-mode",
      "kling-video-duration",
      "kling-video-aspect-ratio"
    ]);
  });

  it("uses exact provider/model catalog keys instead of loose provider matching", () => {
    expect(findProviderCapability("Kling", "not-real")).toBeUndefined();
    expect(findProviderCapability("Runway", "Seedance")).toBeUndefined();
    expect(findProviderCapabilityByModel("Kling image-to-video")?.id).toBe("kling-video");

    const issues = validateProviderCatalogSelection({
      provider: "Runway",
      model: "Seedance",
      nowIso: "2026-05-03T00:00:00.000Z"
    });

    expect(issues.map((issue) => issue.id)).toEqual(["provider-capability-missing"]);
  });

  it("blocks queueing when the recommendation is not backed by an active catalog entry", () => {
    const staleSuggestion: AiSuggestion = {
      ...externalSuggestion,
      id: "suggestion-unknown-provider",
      options: [
        {
          ...externalSuggestion.options[0]!,
          provider: "Runway",
          model: "Seedance"
        }
      ]
    };
    const [acceptedSuggestion] = decideSuggestion(
      [staleSuggestion],
      staleSuggestion.id,
      "accepted",
      "approved after reviewing cost and risk"
    );

    const decision = queueGenerationRunFromSuggestion({
      id: "run-blocked-provider",
      projectId: "project-01",
      userId: "user-01",
      suggestion: acceptedSuggestion!,
      preferences: DEFAULT_AI_PREFERENCES,
      now: new Date("2026-05-03T00:00:00.000Z")
    });

    expect(decision.status).toBe("blocked");
    expect(decision.run).toBeNull();
    expect(decision.reasons.join(" ")).toContain("needs an exact active capability record");
  });

  it("blocks expired provider capability snapshots before paid queueing", () => {
    const capability = PROVIDER_CAPABILITIES.find((entry) => entry.id === "kling-video")!;
    const issues = validateProviderCapabilityForQueue(
      {
        ...capability,
        lastVerifiedAtIso: "2026-01-01T00:00:00.000Z",
        verificationTtlDays: 1
      },
      "2026-05-03T00:00:00.000Z"
    );

    expect(issues.map((issue) => issue.id)).toContain("kling-video-verification-expired");
  });

  it("turns blocking validation failures into export blockers", () => {
    const report = {
      id: "report-01",
      sceneId: "scene-02",
      runId: "run-02",
      generatedAtIso: "2026-05-03T00:00:00.000Z",
      checks: [
        {
          id: "hand-count",
          label: "Hand anatomy",
          status: "fail" as const,
          severity: "blocking" as const,
          detail: "Anatomy drift needs editor review."
        }
      ]
    };

    expect(getValidationStatus(report)).toBe("blocked");
    expect(blocksExport([report])).toBe(true);
  });

  it("blocks export when a generated scene has no validation report", () => {
    const report = {
      id: "report-01",
      sceneId: "scene-01",
      runId: "run-01",
      generatedAtIso: "2026-05-03T00:00:00.000Z",
      checks: [
        {
          id: "black-frame",
          label: "Black frame",
          status: "pass" as const,
          severity: "blocking" as const,
          detail: "No black frames detected."
        }
      ]
    };
    const missing = getMissingValidationSceneIds(["scene-01", "scene-02"], [report]);
    const readiness = evaluateExportReadiness({
      pendingSuggestionCount: 0,
      requiredValidationSceneIds: ["scene-01", "scene-02"],
      reports: [report],
      manifest: {
        id: "manifest-ready-except-validation",
        projectId: "project-01",
        previewRenderStatus: "ready",
        costLedger: [],
        rights: [],
        finalDecisionAudit: []
      }
    });

    expect(missing).toEqual(["scene-02"]);
    expect(blocksExport([report], ["scene-01", "scene-02"])).toBe(true);
    expect(readiness.status).toBe("blocked");
    expect(readiness.blockers.join(" ")).toContain("scene-02");
  });

  it("blocks export when validation reports still need review", () => {
    const readiness = evaluateExportReadiness({
      pendingSuggestionCount: 0,
      requiredValidationSceneIds: ["scene-01"],
      reports: [
        {
          id: "report-review",
          sceneId: "scene-01",
          runId: "run-01",
          generatedAtIso: "2026-05-03T00:00:00.000Z",
          checks: [
            {
              id: "identity-drift",
              label: "Identity drift",
              status: "warn",
              severity: "warning",
              detail: "Face similarity is below the target threshold."
            }
          ]
        }
      ],
      manifest: {
        id: "manifest-review",
        projectId: "project-01",
        previewRenderStatus: "ready",
        costLedger: [],
        rights: [],
        finalDecisionAudit: []
      }
    });

    expect(readiness.status).toBe("blocked");
    expect(readiness.blockers.join(" ")).toContain("needs review");
    expect(readiness.blockers.join(" ")).toContain("scene-01");
  });

  it("summarizes concrete export manifest provenance evidence", () => {
    const renderArtifact = createRenderArtifactProof({
      manifestId: "manifest-provenance",
      projectId: "project-01",
      assetIds: ["asset-render-01"],
      modelRunIds: ["run-01"],
      generatedContentLabel: "ai-generated",
      durationSeconds: 5,
      frameRate: 24,
      renderedAtIso: "2026-05-04T00:00:00.000Z"
    });
    const c2paAttachment = createLocalC2paAttachment({
      manifestId: "manifest-provenance",
      renderArtifact,
      generatedContentLabel: "ai-generated",
      attachedAtIso: "2026-05-04T00:00:00.000Z",
      signedBy: "aethon-local-provider-sim"
    });
    const manifest = {
      id: "manifest-provenance",
      projectId: "project-01",
      assetIds: ["asset-render-01"],
      modelRunIds: ["run-01"],
      validationReportIds: ["validation-01"],
      costLedgerEntryIds: ["cost-01"],
      rightsManifestEntryIds: ["rights-01"],
      generatedContentLabel: "ai-generated" as const,
      provenanceSummary: {
        generatedContentLabel: "ai-generated",
        validationReportIds: ["validation-01"],
        renderArtifactId: renderArtifact.id,
        renderArtifactChecksum: renderArtifact.checksum,
        c2paAttachmentId: c2paAttachment.id
      },
      renderArtifact,
      c2paAttachment,
      previewRenderStatus: "ready" as const,
      costLedger: [
        {
          id: "cost-01",
          runId: "run-01",
          sceneId: "scene-01",
          provider: "Kling",
          model: "Kling image-to-video",
          estimatedUsd: 0.74,
          approvedUsd: 0.8,
          status: "spent" as const
        }
      ],
      rights: [
        {
          id: "rights-01",
          assetId: "asset-render-01",
          sceneId: "scene-01",
          assetLabel: "rendered scene 01",
          source: "generated" as const,
          status: "cleared" as const,
          attributionRequired: false,
          licenseEvidenceAssetId: "evidence-license-01"
        }
      ],
      finalDecisionAudit: [
        {
          id: "audit-01",
          actorId: "editor-01",
          decision: "approved export evidence",
          createdAtIso: "2026-05-04T00:00:00.000Z"
        }
      ],
      c2paStatus: "attached" as const
    };
    const reports = [
      {
        id: "validation-01",
        sceneId: "scene-01",
        runId: "run-01",
        generatedAtIso: "2026-05-04T00:00:00.000Z",
        checks: [
          {
            id: "black-frame",
            label: "Black frame",
            status: "pass" as const,
            severity: "blocking" as const,
            detail: "No black frames."
          }
        ]
      }
    ];

    const summary = summarizeExportManifestEvidence(manifest, reports);
    const issues = getExportManifestEvidenceIssues(manifest, reports);
    const readiness = evaluateExportReadiness({
      pendingSuggestionCount: 0,
      requiredValidationSceneIds: ["scene-01"],
      reports,
      manifest
    });

    expect(summary).toMatchObject({
      assetIds: ["asset-render-01"],
      modelRunIds: ["run-01"],
      validationReportIds: ["validation-01"],
      costLedgerEntryIds: ["cost-01"],
      rightsManifestEntryIds: ["rights-01"],
      rightsEvidenceAssetIds: ["evidence-license-01"],
      generatedContentLabel: "ai-generated",
      c2paStatus: "attached",
      renderArtifactId: renderArtifact.id,
      renderArtifactUri: "aethon-render://project-01/manifest-provenance.mp4",
      renderArtifactChecksum: renderArtifact.checksum,
      renderArtifactSourceManifestHash: renderArtifact.sourceManifestHash,
      hasRenderArtifact: true,
      c2paAttachmentStatus: "attached",
      c2paAttachmentId: c2paAttachment.id,
      c2paAttachmentPolicy: "local-provider-sim",
      c2paAttachmentVerificationStatus: "verified",
      c2paSignatureAlgorithm: "aethon-local-sha256-attestation-v1",
      c2paSignedBy: "aethon-local-provider-sim",
      c2paManifestHash: c2paAttachment.manifestHash,
      hasProvenanceSummary: true
    });
    expect(issues).toEqual({ blockers: [], warnings: [] });
    expect(readiness.status).toBe("ready");
  });

  it("blocks generated ready exports without verified C2PA-ready local attestation", () => {
    const renderArtifact = createRenderArtifactProof({
      manifestId: "manifest-no-attestation",
      projectId: "project-01",
      assetIds: ["asset-render-01"],
      modelRunIds: ["run-01"],
      generatedContentLabel: "mixed-source",
      durationSeconds: 5,
      frameRate: 24,
      renderedAtIso: "2026-05-04T00:00:00.000Z"
    });
    const manifest = {
      id: "manifest-no-attestation",
      projectId: "project-01",
      assetIds: ["asset-render-01"],
      modelRunIds: ["run-01"],
      validationReportIds: ["validation-01"],
      costLedgerEntryIds: ["cost-01"],
      rightsManifestEntryIds: ["rights-01"],
      generatedContentLabel: "mixed-source" as const,
      provenanceSummary: { generatedContentLabel: "mixed-source" },
      renderArtifact,
      previewRenderStatus: "ready" as const,
      costLedger: [
        {
          id: "cost-01",
          runId: "run-01",
          sceneId: "scene-01",
          provider: "Kling",
          model: "Kling image-to-video",
          estimatedUsd: 0.4,
          approvedUsd: 0.5,
          status: "spent" as const
        }
      ],
      rights: [
        {
          id: "rights-01",
          assetId: "asset-render-01",
          sceneId: "scene-01",
          assetLabel: "Generated output",
          source: "generated" as const,
          status: "cleared" as const,
          attributionRequired: false,
          licenseEvidenceAssetId: "evidence-license-01"
        }
      ],
      finalDecisionAudit: [],
      c2paStatus: "not-attached" as const
    };

    const readiness = evaluateExportReadiness({
      pendingSuggestionCount: 0,
      requiredValidationSceneIds: [],
      reports: [],
      manifest
    });

    expect(readiness.status).toBe("blocked");
    expect(readiness.blockers.join(" ")).toContain("C2PA-ready local attestation");
    expect(readiness.blockers.join(" ")).toContain("attachment evidence is missing");
  });

  it("blocks tampered C2PA-ready attachment checksums", () => {
    const renderArtifact = createRenderArtifactProof({
      manifestId: "manifest-tampered-attestation",
      projectId: "project-01",
      assetIds: ["asset-render-01"],
      modelRunIds: ["run-01"],
      generatedContentLabel: "ai-generated",
      durationSeconds: 5,
      frameRate: 24,
      renderedAtIso: "2026-05-04T00:00:00.000Z"
    });
    const c2paAttachment = createLocalC2paAttachment({
      manifestId: "manifest-tampered-attestation",
      renderArtifact,
      generatedContentLabel: "ai-generated",
      attachedAtIso: "2026-05-04T00:00:00.000Z",
      signedBy: "aethon-local-provider-sim"
    });
    const readiness = evaluateExportReadiness({
      pendingSuggestionCount: 0,
      requiredValidationSceneIds: [],
      reports: [],
      manifest: {
        id: "manifest-tampered-attestation",
        projectId: "project-01",
        assetIds: ["asset-render-01"],
        modelRunIds: ["run-01"],
        validationReportIds: ["validation-01"],
        costLedgerEntryIds: ["cost-01"],
        rightsManifestEntryIds: ["rights-01"],
        generatedContentLabel: "ai-generated",
        provenanceSummary: { generatedContentLabel: "ai-generated" },
        renderArtifact: {
          ...renderArtifact,
          checksum: "0".repeat(64)
        },
        c2paAttachment,
        previewRenderStatus: "ready",
        costLedger: [
          {
            id: "cost-01",
            runId: "run-01",
            sceneId: "scene-01",
            provider: "Kling",
            model: "Kling image-to-video",
            estimatedUsd: 0.4,
            approvedUsd: 0.5,
            status: "spent"
          }
        ],
        rights: [
          {
            id: "rights-01",
            assetId: "asset-render-01",
            sceneId: "scene-01",
            assetLabel: "Generated output",
            source: "generated",
            status: "cleared",
            attributionRequired: false,
            licenseEvidenceAssetId: "evidence-license-01"
          }
        ],
        finalDecisionAudit: [],
        c2paStatus: "attached"
      }
    });

    expect(readiness.status).toBe("blocked");
    expect(readiness.blockers.join(" ")).toContain("artifact checksum does not match");
  });

  it("blocks export when manifest provenance evidence is incomplete", () => {
    const manifest = {
      id: "manifest-incomplete-evidence",
      projectId: "project-01",
      previewRenderStatus: "ready" as const,
      costLedger: [],
      rights: [],
      finalDecisionAudit: [],
      c2paStatus: "not-attached" as const
    };

    const readiness = evaluateExportReadiness({
      pendingSuggestionCount: 0,
      reports: [],
      manifest
    });

    expect(readiness.status).toBe("blocked");
    expect(readiness.blockers.join(" ")).toContain("asset id");
    expect(readiness.blockers.join(" ")).toContain("model run id");
    expect(readiness.blockers.join(" ")).toContain("validation report id");
    expect(readiness.blockers.join(" ")).toContain("generated-content label");
    expect(readiness.blockers.join(" ")).toContain("render artifact");
  });

  it("requires pending AI choices, rights review, and cost approval before export", () => {
    const readiness = evaluateExportReadiness({
      pendingSuggestionCount: 1,
      reports: [],
      manifest: {
        id: "manifest-01",
        projectId: "project-01",
        previewRenderStatus: "not-rendered",
        costLedger: [
          {
            id: "cost-01",
            sceneId: "scene-01",
            provider: "ByteDance",
            model: "Seedance",
            estimatedUsd: 1.25,
            approvedUsd: 1,
            status: "estimated"
          }
        ],
        rights: [
          {
            id: "rights-01",
            sceneId: "scene-01",
            assetLabel: "Uploaded voice reference",
            source: "uploaded",
            status: "needs-review",
            attributionRequired: true
          }
        ],
        finalDecisionAudit: []
      }
    });

    expect(readiness.status).toBe("blocked");
    expect(readiness.blockers.join(" ")).toContain("AI adviser");
    expect(readiness.blockers.join(" ")).toContain("budget");
    expect(readiness.warnings.join(" ")).toContain("rights review");
    expect(readiness.warnings.join(" ")).toContain("Preview render");
  });

  it("blocks export when actual spend exceeds the approved budget", () => {
    const readiness = evaluateExportReadiness({
      pendingSuggestionCount: 0,
      reports: [],
      manifest: {
        id: "manifest-overspend",
        projectId: "project-01",
        previewRenderStatus: "ready",
        costLedger: [
          {
            id: "cost-01",
            sceneId: "scene-01",
            provider: "ByteDance",
            model: "Seedance",
            estimatedUsd: 0.5,
            approvedUsd: 0.74,
            actualCostUsd: 50.0,
            status: "spent"
          }
        ],
        rights: [],
        finalDecisionAudit: []
      }
    });

    expect(readiness.status).not.toBe("ready");
    expect(readiness.blockers.join(" ")).toContain("actual spend");
  });
});
