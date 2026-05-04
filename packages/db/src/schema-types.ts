import type {
  AiControlMode,
  ApprovalGateStatus,
  BudgetPriority,
  ExportReadinessStatus,
  GenerationRunStatus,
  GenerationRunEventType,
  GenerationRunTriggerSource,
  ProviderCapability,
  ProviderInputMode,
  SceneEmotion,
  SceneSpecSelectionMode,
  ShotType,
  SuggestionDecision
} from "@aethon/core";

export interface AssetRecord {
  id: string;
  projectId: string;
  sourceType: "upload" | "generated" | "external-link" | "stock";
  storageUrl: string | null;
  contentHash: string | null;
  licenseType: string;
  consentStatus: "unknown" | "granted" | "restricted" | "missing" | "not-required";
  retentionUntil: string | null;
  createdAt: string;
}

export interface AssetWrite {
  id: string;
  sourceType: AssetRecord["sourceType"];
  storageUrl?: string | null;
  contentHash?: string | null;
  licenseType?: string;
  consentStatus?: AssetRecord["consentStatus"];
  retentionUntil?: string | null;
}

export interface AiPreferenceRecord {
  id: string;
  projectId: string;
  userId: string;
  globalMode: AiControlMode;
  taskModes: Record<string, unknown>;
  approvalThresholds: Record<string, unknown>;
  updatedAt: string;
}

export interface AiSuggestionRecord {
  id: string;
  projectId: string;
  sceneId: string;
  userId: string;
  taskId: string;
  suggestionType: string;
  title: string;
  summary: string;
  recommendedOptionId: string | null;
  alternatives: unknown[];
  riskFlags: unknown[];
  modeAtCreation: AiControlMode;
  gateStatus: ApprovalGateStatus;
  requiresApproval: boolean;
  userDecision: SuggestionDecision;
  decisionReason: string | null;
  decisionAudit: Record<string, unknown>;
  decidedAt: string | null;
  createdAt: string;
}

export interface GenerationRunRecord {
  id: string;
  projectId: string;
  sceneId: string;
  suggestionId: string | null;
  userId: string;
  providerCapabilityId: string;
  providerKey: string;
  modelKey: string;
  provider: string;
  model: string;
  pricingVersion: string;
  providerTermsUrl: string;
  providerCapabilityVerifiedAt: string;
  providerJobId: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  claimToken: string | null;
  claimedAt: string | null;
  promptHash: string | null;
  inputAssetIds: string[];
  outputAssetId: string | null;
  costEstimate: number | null;
  status: GenerationRunStatus;
  triggerSource: GenerationRunTriggerSource;
  failureReason: string | null;
  triggerMode: AiControlMode;
  retryCount: number;
  maxRetries: number;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  auditTrail: unknown[];
  statusDetail: Record<string, unknown>;
  createdAt: string;
}

export interface GenerationRunEventRecord {
  id: string;
  projectId: string;
  generationRunId: string;
  sceneId: string;
  eventType: GenerationRunEventType;
  status: GenerationRunStatus;
  actorId: string;
  reason: string;
  providerJobId: string | null;
  outputAssetId: string | null;
  failureReason: string | null;
  retryCount: number;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  claimToken: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ProviderCapabilityVersionRecord {
  id: string;
  projectId: string;
  provider: string;
  providerKey: string;
  model: string;
  modelKey: string;
  kind: ProviderCapability["kind"];
  lifecycleStatus: ProviderCapability["status"];
  capability: Record<string, unknown>;
  pricingVersion: string;
  providerTermsUrl: string;
  sourceUrl: string;
  termsRisk: ProviderCapability["termsRisk"];
  dataRetention: ProviderCapability["dataRetention"];
  commercialUseAllowed: boolean;
  regionAvailability: string[];
  lastVerifiedAt: string;
  verifiedExpiresAt: string;
  deprecatedAt: string | null;
  replacementCapabilityId: string | null;
  createdAt: string;
}

export interface SceneSpecRecord {
  id: string;
  projectId: string;
  sceneId: string;
  requestedBy: string;
  decisionSuggestionId: string | null;
  approvalPolicy: Record<string, unknown>;
  userIntent: string;
  cameraAngle: string;
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
  manualOverrideReason: string | null;
  sourceAssetIds: string[];
  referenceAssetIds: string[];
  constraints: Record<string, unknown>;
  continuityLocks: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationReportRecord {
  id: string;
  projectId: string;
  sceneId: string;
  generationRunId: string | null;
  generatedBy: string;
  generatedAt: string;
  status: ExportReadinessStatus;
  checks: unknown[];
  artifactAssetIds: string[];
  createdAt: string;
}

export interface CostLedgerEntryRecord {
  id: string;
  projectId: string;
  sceneId: string | null;
  generationRunId: string | null;
  provider: string;
  model: string;
  currency: "USD";
  estimatedUsd: number;
  approvedUsd: number;
  actualUsd: number | null;
  approvedBy: string | null;
  budgetId: string | null;
  status: "estimated" | "approved" | "spent";
  createdAt: string;
}

export interface RightsManifestEntryRecord {
  id: string;
  projectId: string;
  sceneId: string | null;
  assetId: string | null;
  assetLabel: string;
  source: "generated" | "uploaded" | "licensed" | "manual";
  status: "cleared" | "needs-review" | "blocked";
  attributionRequired: boolean;
  attributionText: string | null;
  licenseEvidenceAssetId: string | null;
  consentEvidenceAssetId: string | null;
  provenancePayload: Record<string, unknown>;
  createdAt: string;
}

export interface ExportManifestRecord {
  id: string;
  projectId: string;
  assetIds: string[];
  modelRuns: string[];
  rightsSummary: Record<string, unknown>;
  generatedContentLabel: string;
  provenanceSummary: Record<string, unknown>;
  renderArtifact: Record<string, unknown> | null;
  c2paAttachment: Record<string, unknown> | null;
  renderArtifactChecksum: string | null;
  sourceManifestHash: string | null;
  c2paManifestHash: string | null;
  previewRenderStatus: "not-rendered" | "rendering" | "ready";
  costLedgerEntryIds: string[];
  rightsManifestEntryIds: string[];
  finalDecisionAudit: unknown[];
  c2paStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationRunEvidenceRecord {
  run: GenerationRunRecord | null;
  outputAsset: AssetRecord | null;
  events: GenerationRunEventRecord[];
  validationReports: ValidationReportRecord[];
  costLedgerEntries: CostLedgerEntryRecord[];
  rightsManifestEntries: RightsManifestEntryRecord[];
  exportManifests: ExportManifestRecord[];
}
