import {
  claimGenerationRun,
  createGenerationRunEvent,
  transitionGenerationRun,
  type GenerationRun,
  type GenerationRunEvent,
  type GenerationRunEventType
} from "./generation-run";
import {
  createLocalC2paAttachment,
  createRenderArtifactProof,
  evaluateExportReadiness,
  type CostLedgerEntry,
  type ExportManifest,
  type ExportReadiness,
  type RightsManifestEntry,
  type ValidationCheck,
  type ValidationReport
} from "./production-readiness";

export interface SimulatedProviderRunInput {
  run: GenerationRun;
  workerId: string;
  claimToken: string;
  now: Date;
  leaseSeconds?: number;
  providerJobId?: string;
  outputAssetId?: string;
  approvedCostUsd?: number;
  actualCostUsd?: number;
  outputDurationSeconds?: number;
  outputFrameRate?: number;
  validationChecks?: ValidationCheck[];
  failWithReason?: string;
}

export type SimulatedProviderRunStatus = "succeeded" | "failed" | "blocked";

export interface SimulatedProviderRunResult {
  status: SimulatedProviderRunStatus;
  run: GenerationRun;
  events: GenerationRunEvent[];
  reasons: string[];
  validationReport: ValidationReport | null;
  costLedgerEntry: CostLedgerEntry | null;
  rightsManifestEntry: RightsManifestEntry | null;
  exportManifest: ExportManifest | null;
  exportReadiness: ExportReadiness | null;
}

export function simulateProviderRun(
  input: SimulatedProviderRunInput
): SimulatedProviderRunResult {
  const leaseSeconds = input.leaseSeconds ?? 180;
  const providerJobId = input.providerJobId ?? `sim-job-${input.run.id}`;
  const outputAssetId = input.outputAssetId ?? `asset-${input.run.id}`;
  const claim = claimGenerationRun({
    id: `${input.run.id}-event-claimed`,
    run: input.run,
    now: input.now,
    actorId: input.workerId,
    claimToken: input.claimToken,
    leaseSeconds,
    reason: "Simulated provider worker claimed the generation run."
  });

  if (claim.status === "blocked" || !claim.run) {
    return {
      status: "blocked",
      run: input.run,
      events: [],
      reasons: claim.reasons,
      validationReport: null,
      costLedgerEntry: null,
      rightsManifestEntry: null,
      exportManifest: null,
      exportReadiness: null
    };
  }

  const runningRun = {
    ...claim.run,
    providerJobId,
    updatedAt: input.now.toISOString()
  };
  const events = [
    ...(claim.event ? [claim.event] : []),
    createProviderSimEvent({
      id: `${input.run.id}-event-running`,
      run: runningRun,
      type: "running",
      at: input.now,
      actorId: input.workerId,
      reason: "Simulated provider job started.",
      latencyMs: 0
    })
  ];

  if (input.failWithReason) {
    const failedAt = addSeconds(input.now, 4);
    const failedRun = transitionGenerationRun({
      run: runningRun,
      to: "failed",
      now: failedAt,
      actorId: input.workerId,
      reason: input.failWithReason,
      providerJobId,
      failureReason: input.failWithReason
    });

    return {
      status: "failed",
      run: failedRun,
      events: [
        ...events,
        createProviderSimEvent({
          id: `${input.run.id}-event-failed`,
          run: failedRun,
          type: "failed",
          at: failedAt,
          actorId: input.workerId,
          reason: input.failWithReason,
          latencyMs: 4000
        })
      ],
      reasons: [input.failWithReason],
      validationReport: null,
      costLedgerEntry: null,
      rightsManifestEntry: null,
      exportManifest: null,
      exportReadiness: null
    };
  }

  const succeededAt = addSeconds(input.now, 6);
  const succeededRun = transitionGenerationRun({
    run: runningRun,
    to: "succeeded",
    now: succeededAt,
    actorId: input.workerId,
    reason: "Simulated provider job completed.",
    providerJobId,
    outputAssetId
  });
  const validationReport = createSimulatedValidationReport({
    run: succeededRun,
    generatedAt: succeededAt,
    checks: input.validationChecks
  });
  const costLedgerEntry = createSimulatedCostLedgerEntry({
    run: succeededRun,
    approvedCostUsd: input.approvedCostUsd,
    actualCostUsd: input.actualCostUsd
  });
  const rightsManifestEntry = createSimulatedRightsManifestEntry(succeededRun, outputAssetId);
  const exportManifest = createSimulatedExportManifest({
    run: succeededRun,
    validationReport,
    costLedgerEntry,
    rightsManifestEntry,
    exportedAt: succeededAt,
    durationSeconds: input.outputDurationSeconds ?? 6,
    frameRate: input.outputFrameRate ?? 24
  });
  const exportReadiness = evaluateExportReadiness({
    manifest: exportManifest,
    pendingSuggestionCount: 0,
    requiredValidationSceneIds: [succeededRun.sceneId],
    reports: [validationReport]
  });

  return {
    status: "succeeded",
    run: succeededRun,
    events: [
      ...events,
      createProviderSimEvent({
        id: `${input.run.id}-event-succeeded`,
        run: succeededRun,
        type: "succeeded",
        at: succeededAt,
        actorId: input.workerId,
        reason: "Simulated provider job completed.",
        latencyMs: 6000
      })
    ],
    reasons: ["Simulated provider job completed."],
    validationReport,
    costLedgerEntry,
    rightsManifestEntry,
    exportManifest,
    exportReadiness
  };
}

function createSimulatedValidationReport({
  run,
  generatedAt,
  checks
}: {
  run: GenerationRun;
  generatedAt: Date;
  checks?: ValidationCheck[];
}): ValidationReport {
  return {
    id: `validation-${run.id}`,
    sceneId: run.sceneId,
    runId: run.id,
    generatedAtIso: generatedAt.toISOString(),
    artifactAssetIds: [run.outputAssetId].filter((assetId): assetId is string => Boolean(assetId)),
    checks:
      checks ??
      [
        {
          id: "black-frame",
          label: "Black frame",
          status: "pass",
          severity: "blocking",
          detail: "No black frames detected by provider simulation."
        },
        {
          id: "identity-stability",
          label: "Identity stability",
          status: "pass",
          severity: "warning",
          detail: "Simulated identity consistency is inside the accepted range.",
          metricValue: 0.91,
          threshold: 0.8
        }
      ]
  };
}

function createSimulatedCostLedgerEntry({
  run,
  approvedCostUsd,
  actualCostUsd
}: {
  run: GenerationRun;
  approvedCostUsd?: number;
  actualCostUsd?: number;
}): CostLedgerEntry {
  const estimatedUsd = run.costEstimateUsd ?? 0;
  const approvedUsd = approvedCostUsd ?? estimatedUsd;

  return {
    id: `cost-${run.id}`,
    runId: run.id,
    sceneId: run.sceneId,
    provider: run.provider,
    model: run.model,
    estimatedUsd,
    approvedUsd,
    actualCostUsd: actualCostUsd ?? estimatedUsd,
    approvedBy: run.userId,
    budgetId: `budget-${run.projectId}`,
    status: "spent"
  };
}

function createSimulatedRightsManifestEntry(
  run: GenerationRun,
  outputAssetId: string
): RightsManifestEntry {
  return {
    id: `rights-${run.id}`,
    assetId: outputAssetId,
    sceneId: run.sceneId,
    assetLabel: outputAssetId,
    source: "generated",
    status: "cleared",
    attributionRequired: false,
    licenseEvidenceAssetId: outputAssetId,
    provenancePayload: {
      runId: run.id,
      provider: run.provider,
      model: run.model,
      pricingVersion: run.pricingVersion
    }
  };
}

function createSimulatedExportManifest({
  run,
  validationReport,
  costLedgerEntry,
  rightsManifestEntry,
  exportedAt,
  durationSeconds,
  frameRate
}: {
  run: GenerationRun;
  validationReport: ValidationReport;
  costLedgerEntry: CostLedgerEntry;
  rightsManifestEntry: RightsManifestEntry;
  exportedAt: Date;
  durationSeconds: number;
  frameRate: number;
}): ExportManifest {
  const manifestId = `export-${run.id}`;
  const assetIds = [run.outputAssetId].filter((assetId): assetId is string => Boolean(assetId));
  const renderArtifact = createRenderArtifactProof({
    manifestId,
    projectId: run.projectId,
    assetIds,
    modelRunIds: [run.id],
    generatedContentLabel: "ai-generated",
    durationSeconds,
    frameRate,
    renderedAtIso: exportedAt.toISOString()
  });
  const c2paAttachment = createLocalC2paAttachment({
    manifestId,
    renderArtifact,
    generatedContentLabel: "ai-generated",
    attachedAtIso: exportedAt.toISOString(),
    signedBy: "aethon-local-provider-sim"
  });

  return {
    id: manifestId,
    projectId: run.projectId,
    assetIds,
    modelRunIds: [run.id],
    validationReportIds: [validationReport.id],
    costLedgerEntryIds: [costLedgerEntry.id],
    rightsManifestEntryIds: [rightsManifestEntry.id],
    generatedContentLabel: "ai-generated",
    provenanceSummary: {
      validationReportIds: [validationReport.id],
      costLedgerEntryIds: [costLedgerEntry.id],
      rightsManifestEntryIds: [rightsManifestEntry.id],
      generatedContentLabel: "ai-generated",
      provider: run.provider,
      model: run.model,
      c2paStatus: "attached",
      renderArtifactId: renderArtifact.id,
      renderArtifactChecksum: renderArtifact.checksum,
      renderArtifactSourceManifestHash: renderArtifact.sourceManifestHash,
      c2paManifestHash: c2paAttachment.manifestHash,
      c2paAttachmentId: c2paAttachment.id
    },
    rightsSummary: {
      generatedAssetCount: 1,
      clearedRightsCount: 1,
      needsReviewCount: 0,
      blockedRightsCount: 0,
      provider: run.provider,
      model: run.model,
      renderArtifactChecksum: renderArtifact.checksum,
      c2paManifestHash: c2paAttachment.manifestHash
    },
    previewRenderStatus: "ready",
    renderArtifact,
    c2paAttachment,
    costLedger: [costLedgerEntry],
    rights: [rightsManifestEntry],
    finalDecisionAudit: [
      {
        id: `audit-${run.id}`,
        actorId: run.userId,
        decision: "provider-simulated-export-ready",
        createdAtIso: exportedAt.toISOString()
      }
    ],
    c2paStatus: "attached"
  };
}

function createProviderSimEvent({
  id,
  run,
  type,
  at,
  actorId,
  reason,
  latencyMs
}: {
  id: string;
  run: GenerationRun;
  type: GenerationRunEventType;
  at: Date;
  actorId: string;
  reason: string;
  latencyMs: number;
}): GenerationRunEvent {
  return createGenerationRunEvent({
    id,
    run,
    type,
    at,
    actorId,
    reason,
    metadata: {
      providerSimulated: true,
      latencyMs
    }
  });
}

function addSeconds(value: Date, seconds: number): Date {
  return new Date(value.getTime() + seconds * 1000);
}
