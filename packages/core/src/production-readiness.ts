export type CameraAngle =
  | "wide"
  | "medium"
  | "close-up"
  | "over-shoulder"
  | "low-angle"
  | "high-angle"
  | "tracking";

export type ShotType =
  | "establishing"
  | "action"
  | "reaction"
  | "insert"
  | "transition"
  | "manual-cut";

export type SceneEmotion =
  | "tense"
  | "quiet"
  | "urgent"
  | "melancholic"
  | "surreal"
  | "neutral";

export type BudgetPriority = "lowest-cost" | "balanced" | "quality-first";

export type SceneSpecSelectionMode = "ai-advised" | "manual-override" | "locked";

export type ProviderInputMode =
  | "text-to-image"
  | "image-to-image"
  | "text-to-video"
  | "image-to-video"
  | "first-last-frame"
  | "inpaint"
  | "local-qc";

export type ProviderCatalogStatus = "active" | "stale" | "deprecated" | "disabled";

export type TermsRisk = "low" | "medium" | "high";

export type ReadinessSeverity = "info" | "warning" | "blocking";

export type ValidationCheckStatus = "pass" | "warn" | "fail" | "not-run";

export type ExportReadinessStatus = "ready" | "needs-review" | "blocked";

export type GeneratedContentLabel =
  | "not-labeled"
  | "ai-generated"
  | "mixed-source"
  | "manual-only";

export type RenderArtifactChecksumAlgorithm = "sha256";

export interface ExportRenderArtifact {
  id: string;
  uri: string;
  checksum: string;
  checksumAlgorithm: RenderArtifactChecksumAlgorithm;
  byteSize: number;
  codec: "h264" | "prores" | "vp9" | "av1";
  container: "mp4" | "mov" | "webm";
  durationSeconds: number;
  frameRate: number;
  renderedAtIso: string;
  renderer: "aethon-local-renderer";
  rendererVersion: string;
  sourceManifestHash: string;
}

export interface C2paProvenanceAttachment {
  id: string;
  manifestHash: string;
  artifactChecksum: string;
  status: "attached" | "not-attached" | "failed" | "not-required";
  signatureAlgorithm: "aethon-local-sha256-attestation-v1" | "not-signed";
  signedBy: string;
  attachedAtIso: string;
  verificationStatus: "verified" | "not-verified" | "failed" | "not-required";
  policy: "local-provider-sim" | "production-c2pa";
}

export interface ReadinessIssue {
  id: string;
  severity: ReadinessSeverity;
  label: string;
  detail: string;
}

export interface SceneSpec {
  id: string;
  sceneId: string;
  userIntent: string;
  requestedBy: string;
  decisionId: string | null;
  approvalPolicy: {
    requiresEditorApproval: boolean;
    maxApprovedCostUsd: number;
    externalProviderAllowed: boolean;
  };
  cameraAngle: CameraAngle;
  emotion: SceneEmotion;
  shotType: ShotType;
  budgetPriority: BudgetPriority;
  isHighlight: boolean;
  targetAspectRatio: string;
  providerInputMode: ProviderInputMode;
  imagePrompt: string;
  videoPrompt: string;
  imageModel: string;
  videoModel: string;
  selectionMode: SceneSpecSelectionMode;
  manualOverrideReason?: string;
  sourceAssetIds: string[];
  referenceAssetIds: string[];
  constraints: {
    rights: string[];
    safety: string[];
    continuity: string[];
  };
  continuityLocks: {
    character: number;
    background: number;
    style: number;
  };
  createdAtIso: string;
  updatedAtIso: string;
}

export interface ProviderCapability {
  id: string;
  providerKey: string;
  modelKey: string;
  provider: string;
  model: string;
  kind: "image" | "video" | "local";
  status: ProviderCatalogStatus;
  sourceUrl: string;
  inputModes: ProviderInputMode[];
  durationSeconds: {
    min: number;
    max: number;
  };
  aspectRatios: string[];
  supportsCameraControl: boolean;
  supportsMotionStrength: boolean;
  supportsMultiReference: boolean;
  supportsRegionEdit: boolean;
  estimatedCostUsd: {
    low: number;
    high: number;
  };
  currency: "USD";
  pricingVersion: string;
  providerTermsUrl: string;
  dataRetention: "unknown" | "none" | "temporary" | "provider-retained";
  commercialUseAllowed: boolean;
  regionAvailability: string[];
  rateLimit: {
    requestsPerMinute: number | null;
    concurrentJobs: number | null;
  };
  lastVerifiedAtIso: string;
  verificationTtlDays: number;
  rightsRisk: "low" | "medium" | "high";
  termsRisk: TermsRisk;
  maxRetries: number;
  bestFor: string[];
  tradeoffs: string[];
}

export interface ProviderRequest {
  provider: string;
  model: string;
  inputMode: ProviderInputMode;
  durationSeconds: number;
  aspectRatio: string;
  nowIso?: string;
}

export interface ProviderCatalogSelection {
  provider: string;
  model: string;
  nowIso?: string;
}

export interface ValidationCheck {
  id: string;
  label: string;
  status: ValidationCheckStatus;
  severity: ReadinessSeverity;
  detail: string;
  metricValue?: number | string;
  threshold?: number | string;
  blockingReason?: string;
  reviewer?: "system" | "editor" | "qa-agent";
  artifactUrl?: string;
  screenshotFrame?: number;
}

export interface ValidationReport {
  id: string;
  sceneId: string;
  runId: string | null;
  generatedAtIso: string;
  checks: ValidationCheck[];
  artifactAssetIds?: string[];
}

export interface CostLedgerEntry {
  id: string;
  runId?: string;
  sceneId: string;
  provider: string;
  model: string;
  estimatedUsd: number;
  approvedUsd: number;
  actualCostUsd?: number;
  approvedBy?: string;
  budgetId?: string;
  status: "estimated" | "approved" | "spent";
}

export interface RightsManifestEntry {
  id: string;
  assetId?: string;
  sceneId: string;
  assetLabel: string;
  source: "generated" | "uploaded" | "licensed" | "manual";
  status: "cleared" | "needs-review" | "blocked";
  attributionRequired: boolean;
  attributionText?: string;
  licenseEvidenceAssetId?: string;
  consentEvidenceAssetId?: string;
  provenancePayload?: Record<string, string | number | boolean>;
}

export interface ExportManifest {
  id: string;
  projectId: string;
  assetIds?: string[];
  modelRunIds?: string[];
  validationReportIds?: string[];
  costLedgerEntryIds?: string[];
  rightsManifestEntryIds?: string[];
  generatedContentLabel?: GeneratedContentLabel;
  provenanceSummary?: Record<string, unknown>;
  renderArtifact?: ExportRenderArtifact;
  c2paAttachment?: C2paProvenanceAttachment;
  rightsSummary?: Record<string, unknown>;
  previewRenderStatus: "not-rendered" | "rendering" | "ready";
  costLedger: CostLedgerEntry[];
  rights: RightsManifestEntry[];
  finalDecisionAudit: Array<{
    id: string;
    actorId: string;
      decision: string;
      createdAtIso: string;
    }>;
  c2paStatus?: "not-attached" | "attached" | "failed" | "not-required";
}

export interface ExportReadiness {
  status: ExportReadinessStatus;
  blockers: string[];
  warnings: string[];
}

export interface ExportManifestEvidenceSummary {
  assetIds: string[];
  modelRunIds: string[];
  validationReportIds: string[];
  costLedgerEntryIds: string[];
  rightsManifestEntryIds: string[];
  rightsEvidenceAssetIds: string[];
  generatedContentLabel: GeneratedContentLabel;
  c2paStatus: NonNullable<ExportManifest["c2paStatus"]>;
  renderArtifactId: string | null;
  renderArtifactUri: string | null;
  renderArtifactChecksum: string | null;
  renderArtifactSourceManifestHash: string | null;
  hasRenderArtifact: boolean;
  c2paAttachmentStatus: C2paProvenanceAttachment["status"] | "missing";
  c2paAttachmentId: string | null;
  c2paAttachmentPolicy: C2paProvenanceAttachment["policy"] | null;
  c2paAttachmentVerificationStatus: C2paProvenanceAttachment["verificationStatus"] | null;
  c2paSignatureAlgorithm: C2paProvenanceAttachment["signatureAlgorithm"] | null;
  c2paSignedBy: string | null;
  c2paManifestHash: string | null;
  hasProvenanceSummary: boolean;
}

export const PROVIDER_CAPABILITIES: ProviderCapability[] = [
  {
    id: "seedance-video",
    providerKey: "bytedance",
    modelKey: "seedance",
    provider: "ByteDance",
    model: "Seedance",
    kind: "video",
    status: "active",
    sourceUrl: "https://seed.bytedance.com/",
    inputModes: ["text-to-video", "image-to-video", "first-last-frame"],
    durationSeconds: { min: 2, max: 10 },
    aspectRatios: ["16:9", "9:16", "1:1"],
    supportsCameraControl: true,
    supportsMotionStrength: true,
    supportsMultiReference: true,
    supportsRegionEdit: false,
    estimatedCostUsd: { low: 0.28, high: 0.9 },
    currency: "USD",
    pricingVersion: "2026-05-estimate",
    providerTermsUrl: "https://seed.bytedance.com/",
    dataRetention: "unknown",
    commercialUseAllowed: true,
    regionAvailability: ["global"],
    rateLimit: { requestsPerMinute: null, concurrentJobs: null },
    lastVerifiedAtIso: "2026-05-03T00:00:00.000Z",
    verificationTtlDays: 30,
    rightsRisk: "medium",
    termsRisk: "medium",
    maxRetries: 2,
    bestFor: ["short motion", "multi reference", "cost-aware drafts"],
    tradeoffs: ["cinematic texture may need a second pass"]
  },
  {
    id: "kling-video",
    providerKey: "kling",
    modelKey: "kling-image-to-video",
    provider: "Kuaishou",
    model: "Kling image-to-video",
    kind: "video",
    status: "active",
    sourceUrl: "https://klingai.com/",
    inputModes: ["image-to-video", "first-last-frame"],
    durationSeconds: { min: 3, max: 10 },
    aspectRatios: ["16:9", "9:16", "1:1"],
    supportsCameraControl: true,
    supportsMotionStrength: true,
    supportsMultiReference: false,
    supportsRegionEdit: false,
    estimatedCostUsd: { low: 0.45, high: 1.2 },
    currency: "USD",
    pricingVersion: "2026-05-estimate",
    providerTermsUrl: "https://klingai.com/",
    dataRetention: "unknown",
    commercialUseAllowed: true,
    regionAvailability: ["global"],
    rateLimit: { requestsPerMinute: null, concurrentJobs: null },
    lastVerifiedAtIso: "2026-05-03T00:00:00.000Z",
    verificationTtlDays: 30,
    rightsRisk: "medium",
    termsRisk: "medium",
    maxRetries: 2,
    bestFor: ["body motion", "two-keyframe continuity", "detail pass"],
    tradeoffs: ["hand pose and face identity need validation"]
  },
  {
    id: "runway-video",
    providerKey: "runway",
    modelKey: "runway-gen-3",
    provider: "Runway",
    model: "Runway Gen-3",
    kind: "video",
    status: "active",
    sourceUrl: "https://runwayml.com/terms/",
    inputModes: ["text-to-video", "image-to-video"],
    durationSeconds: { min: 4, max: 10 },
    aspectRatios: ["16:9", "9:16"],
    supportsCameraControl: true,
    supportsMotionStrength: true,
    supportsMultiReference: false,
    supportsRegionEdit: true,
    estimatedCostUsd: { low: 0.7, high: 1.6 },
    currency: "USD",
    pricingVersion: "2026-05-estimate",
    providerTermsUrl: "https://runwayml.com/terms/",
    dataRetention: "unknown",
    commercialUseAllowed: true,
    regionAvailability: ["global"],
    rateLimit: { requestsPerMinute: null, concurrentJobs: null },
    lastVerifiedAtIso: "2026-05-03T00:00:00.000Z",
    verificationTtlDays: 30,
    rightsRisk: "medium",
    termsRisk: "medium",
    maxRetries: 1,
    bestFor: ["cinematic passes", "camera movement", "region revision"],
    tradeoffs: ["cost is higher for repeated iteration"]
  },
  {
    id: "aethon-local-qc",
    providerKey: "local",
    modelKey: "aethon-export-checker",
    provider: "local",
    model: "AETHON export checker",
    kind: "local",
    status: "active",
    sourceUrl: "local://aethon-export-checker",
    inputModes: ["local-qc"],
    durationSeconds: { min: 0, max: 1800 },
    aspectRatios: ["16:9", "9:16", "1:1", "4:5"],
    supportsCameraControl: false,
    supportsMotionStrength: false,
    supportsMultiReference: false,
    supportsRegionEdit: false,
    estimatedCostUsd: { low: 0, high: 0 },
    currency: "USD",
    pricingVersion: "local-v1",
    providerTermsUrl: "local://aethon-export-checker",
    dataRetention: "none",
    commercialUseAllowed: true,
    regionAvailability: ["local"],
    rateLimit: { requestsPerMinute: null, concurrentJobs: 1 },
    lastVerifiedAtIso: "2026-05-03T00:00:00.000Z",
    verificationTtlDays: 3650,
    rightsRisk: "low",
    termsRisk: "low",
    maxRetries: 0,
    bestFor: ["black frame check", "audio silence check", "manifest review"],
    tradeoffs: ["does not generate or repair media"]
  }
];

export function validateSceneSpecForRouting(spec: SceneSpec): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];

  if (spec.userIntent.trim().length < 12) {
    issues.push({
      id: `${spec.id}-intent-short`,
      severity: "blocking",
      label: "Intent is too thin",
      detail: "A scene needs a clear editor intent before the AI adviser can recommend a model."
    });
  }

  if (!spec.imagePrompt.trim() || !spec.videoPrompt.trim()) {
    issues.push({
      id: `${spec.id}-prompt-missing`,
      severity: "blocking",
      label: "Prompt pair is incomplete",
      detail: "Image and video prompts must both be present so the editor can compare the AI plan."
    });
  }

  if (spec.approvalPolicy.externalProviderAllowed && spec.approvalPolicy.maxApprovedCostUsd <= 0) {
    issues.push({
      id: `${spec.id}-budget-approval-missing`,
      severity: "blocking",
      label: "External provider budget is not approved",
      detail: "Paid provider routing needs an approved budget before it can leave adviser mode."
    });
  }

  if (spec.sourceAssetIds.length === 0) {
    issues.push({
      id: `${spec.id}-source-assets-missing`,
      severity: "warning",
      label: "Source assets are not linked",
      detail: "Scene memory is weaker without explicit source assets for continuity and rights review."
    });
  }

  if (spec.selectionMode === "manual-override" && !spec.manualOverrideReason?.trim()) {
    issues.push({
      id: `${spec.id}-manual-reason-missing`,
      severity: "warning",
      label: "Manual override needs a reason",
      detail: "A short reason keeps later agents from reverting the editor's choice."
    });
  }

  if (spec.isHighlight && spec.budgetPriority === "lowest-cost") {
    issues.push({
      id: `${spec.id}-highlight-cost-tension`,
      severity: "warning",
      label: "Highlight scene has cost tension",
      detail: "Quality-first routing may be safer for a highlight scene even if the draft stays low-cost."
    });
  }

  return issues;
}

export function findProviderCapability(
  provider: string,
  model: string
): ProviderCapability | undefined {
  const providerKey = normalizeProviderKey(provider);
  const modelKey = normalizeProviderKey(model);

  return PROVIDER_CAPABILITIES.find((capability) => {
    return (
      normalizeProviderKey(capability.providerKey) === providerKey &&
      normalizeProviderKey(capability.modelKey) === modelKey
    );
  });
}

export function findProviderCapabilityByModel(model: string): ProviderCapability | undefined {
  const modelKey = normalizeProviderKey(model);

  return PROVIDER_CAPABILITIES.find(
    (capability) => normalizeProviderKey(capability.modelKey) === modelKey
  );
}

export function validateProviderCatalogSelection(
  selection: ProviderCatalogSelection
): ReadinessIssue[] {
  const capability = findProviderCapability(selection.provider, selection.model);

  if (!capability) {
    return [
      {
        id: "provider-capability-missing",
        severity: "blocking",
        label: "Provider capability is unknown",
        detail: `${selection.provider} / ${selection.model} needs an exact active capability record before it can be routed.`
      }
    ];
  }

  return validateProviderCapabilityForQueue(capability, selection.nowIso);
}

export function validateProviderCapabilityForQueue(
  capability: ProviderCapability,
  nowIso = new Date().toISOString()
): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];

  if (capability.status === "disabled") {
    issues.push({
      id: `${capability.id}-disabled`,
      severity: "blocking",
      label: "Provider capability is disabled",
      detail: `${capability.provider} / ${capability.model} is disabled and cannot queue generation runs.`
    });
  }

  if (capability.status === "deprecated") {
    issues.push({
      id: `${capability.id}-deprecated`,
      severity: "blocking",
      label: "Provider capability is deprecated",
      detail: `${capability.provider} / ${capability.model} needs a replacement capability before queueing.`
    });
  }

  if (capability.status === "stale") {
    issues.push({
      id: `${capability.id}-stale`,
      severity: "blocking",
      label: "Provider capability is stale",
      detail: `${capability.provider} / ${capability.model} must be re-verified before queueing.`
    });
  }

  if (isProviderCapabilityExpired(capability, nowIso)) {
    issues.push({
      id: `${capability.id}-verification-expired`,
      severity: "blocking",
      label: "Provider capability verification expired",
      detail: `${capability.provider} / ${capability.model} must be re-verified before paid or external queueing.`
    });
  }

  if (capability.termsRisk === "high") {
    issues.push({
      id: `${capability.id}-terms-risk`,
      severity: "warning",
      label: "Provider terms need legal review",
      detail: `${capability.provider} / ${capability.model} has high terms risk in the catalog.`
    });
  }

  if (!capability.commercialUseAllowed) {
    issues.push({
      id: `${capability.id}-commercial-use-blocked`,
      severity: "blocking",
      label: "Commercial use is not allowed",
      detail: `${capability.provider} / ${capability.model} cannot be queued for commercial export.`
    });
  }

  return issues;
}

export function isProviderCapabilityExpired(
  capability: ProviderCapability,
  nowIso = new Date().toISOString()
): boolean {
  const verifiedAt = Date.parse(capability.lastVerifiedAtIso);
  const now = Date.parse(nowIso);

  if (!Number.isFinite(verifiedAt) || !Number.isFinite(now)) {
    return true;
  }

  const expiresAt = verifiedAt + capability.verificationTtlDays * 24 * 60 * 60 * 1000;

  return now > expiresAt;
}

export function validateProviderRequest(request: ProviderRequest): ReadinessIssue[] {
  const capability = findProviderCapability(request.provider, request.model);

  if (!capability) {
    return [
      {
        id: "provider-capability-missing",
        severity: "blocking",
        label: "Provider capability is unknown",
        detail: `${request.provider} / ${request.model} needs a capability record before it can be routed.`
      }
    ];
  }

  const issues: ReadinessIssue[] = validateProviderCapabilityForQueue(
    capability,
    request.nowIso
  );

  if (!capability.inputModes.includes(request.inputMode)) {
    issues.push({
      id: `${capability.id}-input-mode`,
      severity: "blocking",
      label: "Input mode is unsupported",
      detail: `${capability.model} does not support ${request.inputMode}.`
    });
  }

  if (
    request.durationSeconds < capability.durationSeconds.min ||
    request.durationSeconds > capability.durationSeconds.max
  ) {
    issues.push({
      id: `${capability.id}-duration`,
      severity: "blocking",
      label: "Duration is outside provider limits",
      detail: `${capability.model} supports ${capability.durationSeconds.min}-${capability.durationSeconds.max}s.`
    });
  }

  if (!capability.aspectRatios.includes(request.aspectRatio)) {
    issues.push({
      id: `${capability.id}-aspect-ratio`,
      severity: "warning",
      label: "Aspect ratio may need preprocessing",
      detail: `${request.aspectRatio} is not listed for ${capability.model}.`
    });
  }

  return issues;
}

export function getValidationStatus(report: ValidationReport): ExportReadinessStatus {
  if (report.checks.length === 0 || report.checks.some((check) => check.status === "not-run")) {
    return "needs-review";
  }

  if (
    report.checks.some(
      (check) => check.status === "fail" && check.severity === "blocking"
    )
  ) {
    return "blocked";
  }

  if (report.checks.some((check) => check.status === "fail" || check.status === "warn")) {
    return "needs-review";
  }

  return "ready";
}

export function getMissingValidationSceneIds(
  requiredValidationSceneIds: string[],
  reports: ValidationReport[]
): string[] {
  const reportedSceneIds = new Set(reports.map((report) => report.sceneId));

  return Array.from(new Set(requiredValidationSceneIds)).filter(
    (sceneId) => !reportedSceneIds.has(sceneId)
  );
}

export function blocksExport(
  reports: ValidationReport[],
  requiredValidationSceneIds: string[] = []
): boolean {
  return (
    getMissingValidationSceneIds(requiredValidationSceneIds, reports).length > 0 ||
    reports.some((report) => getValidationStatus(report) === "blocked")
  );
}

export function evaluateExportReadiness({
  manifest,
  pendingSuggestionCount,
  requiredValidationSceneIds = [],
  reports
}: {
  manifest: ExportManifest;
  pendingSuggestionCount: number;
  requiredValidationSceneIds?: string[];
  reports: ValidationReport[];
}): ExportReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const missingValidationSceneIds = getMissingValidationSceneIds(
    requiredValidationSceneIds,
    reports
  );

  if (pendingSuggestionCount > 0) {
    blockers.push(`${pendingSuggestionCount} AI adviser decision(s) still need editor review.`);
  }

  if (missingValidationSceneIds.length > 0) {
    blockers.push(
      `Validation report is missing for generated scene(s): ${missingValidationSceneIds.join(", ")}.`
    );
  }

  if (reports.some((report) => getValidationStatus(report) === "blocked")) {
    blockers.push("One or more validation reports contain blocking QC failures.");
  }

  const reviewSceneIds = reports
    .filter((report) => getValidationStatus(report) === "needs-review")
    .map((report) => report.sceneId);

  if (reviewSceneIds.length > 0) {
    blockers.push(
      `Validation report still needs review for generated scene(s): ${Array.from(
        new Set(reviewSceneIds)
      ).join(", ")}.`
    );
  }

  for (const entry of manifest.rights) {
    if (entry.status === "blocked") {
      blockers.push(`${entry.assetLabel} has a blocked rights manifest entry.`);
    } else if (entry.status === "needs-review") {
      warnings.push(`${entry.assetLabel} still needs rights review.`);
    }

    if (entry.attributionRequired && !entry.attributionText?.trim()) {
      warnings.push(`${entry.assetLabel} requires attribution text before publish.`);
    }
  }

  for (const entry of manifest.costLedger) {
    if (entry.estimatedUsd > entry.approvedUsd) {
      blockers.push(`${entry.sceneId} exceeds its approved generation budget.`);
    } else if (entry.status === "estimated") {
      warnings.push(`${entry.sceneId} cost is still an estimate.`);
    }

    if (entry.actualCostUsd != null && entry.actualCostUsd > entry.approvedUsd) {
      blockers.push(`${entry.sceneId} actual spend exceeds its approved generation budget.`);
    }
  }

  if (manifest.previewRenderStatus !== "ready") {
    warnings.push("Preview render is not ready yet.");
  }

  const evidenceIssues = getExportManifestEvidenceIssues(manifest, reports);
  blockers.push(...evidenceIssues.blockers);
  warnings.push(...evidenceIssues.warnings);

  return {
    status: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "needs-review" : "ready",
    blockers,
    warnings
  };
}

export function summarizeExportManifestEvidence(
  manifest: ExportManifest,
  reports: ValidationReport[] = []
): ExportManifestEvidenceSummary {
  const assetIds = manifest.assetIds ?? getManifestAssetIds(manifest);
  const modelRunIds = manifest.modelRunIds ?? getManifestModelRunIds(manifest);
  const validationReportIds =
    manifest.validationReportIds ?? reports.map((report) => report.id);
  const costLedgerEntryIds =
    manifest.costLedgerEntryIds ?? manifest.costLedger.map((entry) => entry.id);
  const rightsManifestEntryIds =
    manifest.rightsManifestEntryIds ?? manifest.rights.map((entry) => entry.id);
  const rightsEvidenceAssetIds = getManifestRightsEvidenceAssetIds(manifest);

  return {
    assetIds,
    modelRunIds,
    validationReportIds,
    costLedgerEntryIds,
    rightsManifestEntryIds,
    rightsEvidenceAssetIds,
    generatedContentLabel: manifest.generatedContentLabel ?? "not-labeled",
    c2paStatus: manifest.c2paStatus ?? "not-attached",
    renderArtifactId: manifest.renderArtifact?.id ?? null,
    renderArtifactUri: manifest.renderArtifact?.uri ?? null,
    renderArtifactChecksum: manifest.renderArtifact?.checksum ?? null,
    renderArtifactSourceManifestHash: manifest.renderArtifact?.sourceManifestHash ?? null,
    hasRenderArtifact: Boolean(manifest.renderArtifact),
    c2paAttachmentStatus: manifest.c2paAttachment?.status ?? "missing",
    c2paAttachmentId: manifest.c2paAttachment?.id ?? null,
    c2paAttachmentPolicy: manifest.c2paAttachment?.policy ?? null,
    c2paAttachmentVerificationStatus: manifest.c2paAttachment?.verificationStatus ?? null,
    c2paSignatureAlgorithm: manifest.c2paAttachment?.signatureAlgorithm ?? null,
    c2paSignedBy: manifest.c2paAttachment?.signedBy ?? null,
    c2paManifestHash: manifest.c2paAttachment?.manifestHash ?? null,
    hasProvenanceSummary:
      Boolean(manifest.provenanceSummary) || Object.keys(manifest.rightsSummary ?? {}).length > 0
  };
}

export function getExportManifestEvidenceIssues(
  manifest: ExportManifest,
  reports: ValidationReport[] = []
): { blockers: string[]; warnings: string[] } {
  const evidence = summarizeExportManifestEvidence(manifest, reports);
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (evidence.assetIds.length === 0) {
    blockers.push("Export manifest is missing output asset id evidence.");
  }

  if (evidence.modelRunIds.length === 0) {
    blockers.push("Export manifest is missing model run id evidence.");
  }

  if (evidence.validationReportIds.length === 0) {
    blockers.push("Export manifest is missing validation report id evidence.");
  }

  if (evidence.costLedgerEntryIds.length === 0) {
    blockers.push("Export manifest is missing cost ledger evidence.");
  }

  if (evidence.rightsManifestEntryIds.length === 0) {
    blockers.push("Export manifest is missing rights manifest evidence.");
  }

  if (evidence.generatedContentLabel === "not-labeled") {
    blockers.push("Export manifest is missing a generated-content label.");
  }

  const needsGeneratedContentAttestation =
    manifest.previewRenderStatus === "ready" &&
    (evidence.generatedContentLabel === "ai-generated" ||
      evidence.generatedContentLabel === "mixed-source");

  if (!evidence.hasRenderArtifact && manifest.previewRenderStatus === "ready") {
    blockers.push("Export manifest is missing reproducible render artifact proof.");
  }

  if (manifest.renderArtifact && !isValidSha256Hex(manifest.renderArtifact.checksum)) {
    blockers.push("Render artifact checksum must be SHA-256 hex evidence.");
  }

  if (manifest.renderArtifact && !isValidSha256Hex(manifest.renderArtifact.sourceManifestHash)) {
    blockers.push("Render artifact source manifest hash must be SHA-256 hex evidence.");
  }

  if (manifest.renderArtifact && manifest.renderArtifact.checksumAlgorithm !== "sha256") {
    blockers.push("Render artifact checksum algorithm must be sha256.");
  }

  if (manifest.renderArtifact && manifest.renderArtifact.byteSize <= 0) {
    blockers.push("Render artifact proof needs a positive byte size.");
  }

  if (!evidence.hasProvenanceSummary) {
    warnings.push("Export manifest is missing a provenance summary.");
  }

  if (evidence.rightsEvidenceAssetIds.length === 0) {
    warnings.push("Export manifest has no linked rights evidence asset ids.");
  }

  if (evidence.c2paStatus === "not-attached" && !needsGeneratedContentAttestation) {
    warnings.push("C2PA/provenance attachment is not attached yet.");
  }

  if (evidence.c2paStatus === "attached" && evidence.c2paAttachmentStatus !== "attached") {
    blockers.push("C2PA status is attached but no provenance attachment evidence is present.");
  }

  const localAttestation = verifyLocalC2paAttachment(manifest);

  if (needsGeneratedContentAttestation && !localAttestation.verified) {
    blockers.push(
      `Generated-content exports need verified C2PA-ready local attestation: ${localAttestation.reasons.join("; ")}.`
    );
  } else if (manifest.c2paAttachment && !localAttestation.verified) {
    blockers.push(
      `C2PA-ready local attestation is invalid: ${localAttestation.reasons.join("; ")}.`
    );
  }

  return { blockers, warnings };
}

export function verifyLocalC2paAttachment(
  manifest: ExportManifest
): { verified: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const attachment = manifest.c2paAttachment;
  const renderArtifact = manifest.renderArtifact;
  const generatedContentLabel = manifest.generatedContentLabel ?? "not-labeled";

  if (!renderArtifact) {
    reasons.push("render artifact proof is missing");
  } else {
    if (renderArtifact.checksumAlgorithm !== "sha256") {
      reasons.push("render artifact checksum algorithm is not sha256");
    }

    if (!isValidSha256Hex(renderArtifact.checksum)) {
      reasons.push("render artifact checksum is not valid SHA-256 hex");
    }

    if (!isValidSha256Hex(renderArtifact.sourceManifestHash)) {
      reasons.push("source manifest hash is not valid SHA-256 hex");
    }
  }

  if (!attachment) {
    reasons.push("attachment evidence is missing");
  } else {
    if (attachment.status !== "attached") {
      reasons.push(`attachment status is ${attachment.status}`);
    }

    if (attachment.verificationStatus !== "verified") {
      reasons.push(`verification status is ${attachment.verificationStatus}`);
    }

    if (attachment.signatureAlgorithm !== "aethon-local-sha256-attestation-v1") {
      reasons.push("signature algorithm is not local SHA-256 attestation");
    }

    if (!attachment.signedBy.trim()) {
      reasons.push("signedBy is missing");
    }

    if (renderArtifact && attachment.artifactChecksum !== renderArtifact.checksum) {
      reasons.push("attachment artifact checksum does not match render artifact");
    }

    if (renderArtifact) {
      const expectedManifestHash = createC2paManifestHash({
        manifestId: manifest.id,
        sourceManifestHash: renderArtifact.sourceManifestHash,
        artifactChecksum: renderArtifact.checksum,
        generatedContentLabel
      });

      if (attachment.manifestHash !== expectedManifestHash) {
        reasons.push("attachment manifest hash does not match render/source evidence");
      }
    }
  }

  return {
    verified: reasons.length === 0,
    reasons
  };
}

export function createRenderArtifactProof(input: {
  manifestId: string;
  projectId: string;
  assetIds: string[];
  modelRunIds: string[];
  generatedContentLabel: GeneratedContentLabel;
  durationSeconds: number;
  frameRate: number;
  renderedAtIso: string;
  codec?: ExportRenderArtifact["codec"];
  container?: ExportRenderArtifact["container"];
  rendererVersion?: string;
}): ExportRenderArtifact {
  const codec = input.codec ?? "h264";
  const container = input.container ?? "mp4";
  const renderer = "aethon-local-renderer";
  const rendererVersion = input.rendererVersion ?? "provider-sim-v1";
  const sourceManifestHash = createSha256Digest({
    assetIds: input.assetIds,
    codec,
    container,
    durationSeconds: input.durationSeconds,
    frameRate: input.frameRate,
    generatedContentLabel: input.generatedContentLabel,
    manifestId: input.manifestId,
    modelRunIds: input.modelRunIds,
    projectId: input.projectId,
    renderer,
    rendererVersion
  });
  const deterministicRenderBytes = stableStringify({
    codec,
    container,
    renderedAtIso: input.renderedAtIso,
    renderer,
    rendererVersion,
    sourceManifestHash
  });
  const checksum = createSha256Digest(deterministicRenderBytes);

  return {
    id: `render-${input.manifestId}`,
    uri: `aethon-render://${input.projectId}/${input.manifestId}.${container}`,
    checksum,
    checksumAlgorithm: "sha256",
    byteSize: Math.max(1024, deterministicRenderBytes.length),
    codec,
    container,
    durationSeconds: input.durationSeconds,
    frameRate: input.frameRate,
    renderedAtIso: input.renderedAtIso,
    renderer,
    rendererVersion,
    sourceManifestHash
  };
}

export function createLocalC2paAttachment(input: {
  manifestId: string;
  renderArtifact: ExportRenderArtifact;
  generatedContentLabel: GeneratedContentLabel;
  attachedAtIso: string;
  signedBy: string;
}): C2paProvenanceAttachment {
  const manifestHash = createC2paManifestHash({
    artifactChecksum: input.renderArtifact.checksum,
    generatedContentLabel: input.generatedContentLabel,
    manifestId: input.manifestId,
    sourceManifestHash: input.renderArtifact.sourceManifestHash
  });

  return {
    id: `c2pa-${input.manifestId}`,
    manifestHash,
    artifactChecksum: input.renderArtifact.checksum,
    status: "attached",
    signatureAlgorithm: "aethon-local-sha256-attestation-v1",
    signedBy: input.signedBy,
    attachedAtIso: input.attachedAtIso,
    verificationStatus: "verified",
    policy: "local-provider-sim"
  };
}

function getManifestAssetIds(manifest: ExportManifest): string[] {
  return manifest.rights
    .map((entry) => entry.assetId)
    .filter((assetId): assetId is string => Boolean(assetId));
}

function getManifestModelRunIds(manifest: ExportManifest): string[] {
  return manifest.costLedger
    .map((entry) => entry.runId)
    .filter((runId): runId is string => Boolean(runId));
}

function getManifestRightsEvidenceAssetIds(manifest: ExportManifest): string[] {
  return Array.from(
    new Set(
      manifest.rights.flatMap((entry) =>
        [
          entry.licenseEvidenceAssetId,
          entry.consentEvidenceAssetId
        ].filter((assetId): assetId is string => Boolean(assetId))
      )
    )
  );
}

function createC2paManifestHash(input: {
  manifestId: string;
  sourceManifestHash: string;
  artifactChecksum: string;
  generatedContentLabel: GeneratedContentLabel;
}): string {
  return createSha256Digest(input);
}

function createSha256Digest(value: unknown): string {
  const input = stableStringify(value);
  const bytes = utf8Bytes(input);
  const words = new Array<number>(64).fill(0);
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const bitLengthHigh = Math.floor((bytes.length * 8) / 0x100000000);
  const bitLengthLow = (bytes.length * 8) >>> 0;
  const padded = [...bytes, 0x80];

  while (padded.length % 64 !== 56) {
    padded.push(0);
  }

  padded.push(
    (bitLengthHigh >>> 24) & 0xff,
    (bitLengthHigh >>> 16) & 0xff,
    (bitLengthHigh >>> 8) & 0xff,
    bitLengthHigh & 0xff,
    (bitLengthLow >>> 24) & 0xff,
    (bitLengthLow >>> 16) & 0xff,
    (bitLengthLow >>> 8) & 0xff,
    bitLengthLow & 0xff
  );

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const position = offset + index * 4;
      words[index] =
        ((padded[position] ?? 0) << 24) |
        ((padded[position + 1] ?? 0) << 16) |
        ((padded[position + 2] ?? 0) << 8) |
        (padded[position + 3] ?? 0);
    }

    for (let index = 16; index < 64; index += 1) {
      const s0 =
        rotateRight(words[index - 15]!, 7) ^
        rotateRight(words[index - 15]!, 18) ^
        (words[index - 15]! >>> 3);
      const s1 =
        rotateRight(words[index - 2]!, 17) ^
        rotateRight(words[index - 2]!, 19) ^
        (words[index - 2]! >>> 10);
      words[index] = add32(words[index - 16]!, s0, words[index - 7]!, s1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = add32(h, s1, ch, SHA256_K[index]!, words[index]!);
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = add32(s0, maj);

      h = g;
      g = f;
      f = e;
      e = add32(d, temp1);
      d = c;
      c = b;
      b = a;
      a = add32(temp1, temp2);
    }

    h0 = add32(h0, a);
    h1 = add32(h1, b);
    h2 = add32(h2, c);
    h3 = add32(h3, d);
    h4 = add32(h4, e);
    h5 = add32(h5, f);
    h6 = add32(h6, g);
    h7 = add32(h7, h);
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => word.toString(16).padStart(8, "0"))
    .join("");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(",")}}`;
}

function normalizeProviderKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isValidSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

function add32(...values: number[]): number {
  return values.reduce((sum, value) => (sum + value) >>> 0, 0);
}

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function utf8Bytes(value: string): number[] {
  return Array.from(new TextEncoder().encode(value));
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];
